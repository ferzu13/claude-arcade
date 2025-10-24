#!/usr/bin/env node

// Suppress deprecation warnings from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') return;
  console.warn(warning);
});

import * as pty from 'node-pty';
import { BrickBreakerGame } from './games/brick-breaker';
import { submitScore, promptForName } from './leaderboard';

class BrickBreakerGameWrapper {
  private inGameMode = false;
  private ptyProcess: any = null;
  private gameLoop: NodeJS.Timeout | null = null;
  private game = new BrickBreakerGame();
  private awaitingLeaderboardInput = false;

  start() {
    this.ptyProcess = pty.spawn('claude', process.argv.slice(2), {
      name: 'xterm-256color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd: process.cwd(),
      env: process.env as any
    });

    this.ptyProcess.onData((data: string) => {
      if (!this.inGameMode) {
        process.stdout.write(data);
      }
    });

    this.ptyProcess.onExit(() => {
      if (this.inGameMode) {
        process.stdout.write('\x1b[?1049l');
      }
      process.exit(0);
    });

    process.stdout.on('resize', () => {
      if (this.ptyProcess && !this.inGameMode) {
        this.ptyProcess.resize(process.stdout.columns || 80, process.stdout.rows || 24);
      }
    });

    this.setupInputHandling();
  }

  setupInputHandling() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    process.stdin.on('data', (key: Buffer) => {
      if (key[0] === 7) {
        this.toggleGame();
        return;
      }

      if (this.inGameMode) {
        this.handleGameInput(key);
      } else {
        if (this.ptyProcess) {
          this.ptyProcess.write(key);
        }
      }
    });
  }

  toggleGame() {
    if (!this.inGameMode) {
      process.stdout.write('\x1b[?1049h\x1b[2J\x1b[?25l');
      this.inGameMode = true;
      process.stdout.write(this.game.drawWelcome());
    } else {
      this.stopGame();
      process.stdout.write('\x1b[?25h\x1b[?1049l');
      this.inGameMode = false;
    }
  }

  startGame() {
    this.game.start();
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.update(), 100);
  }

  stopGame() {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = null;
    this.game.stop();
  }

  async handleGameOver(gameOverScreen: string) {
    this.stopGame();
    process.stdout.write(gameOverScreen);
    this.awaitingLeaderboardInput = true;
    
    promptForName(async (name, action) => {
      this.awaitingLeaderboardInput = false;
      
      if (action === 'submit' && name) {
        process.stdout.write('\x1b[2J\x1b[10;1H\x1b[33mSubmitting score...\x1b[0m\n');
        const success = await submitScore('brick_breaker', name, this.game.getScore());
        
        if (success) {
          process.stdout.write('\x1b[32m✓ Score submitted successfully!\x1b[0m\n\n');
        } else {
          process.stdout.write('\x1b[31m✗ Failed to submit score\x1b[0m\n\n');
        }
        process.stdout.write('\x1b[32mPress P to play again | Press Q to exit\x1b[0m\n');
      } else if (action === 'play') {
        this.startGame();
      } else if (action === 'quit') {
        this.toggleGame();
      }
    });
  }

  update() {
    const result = this.game.update();
    
    if (result.won !== undefined || result.lost !== undefined) {
      this.handleGameOver(this.game.drawGameOver(result.won || false));
      return;
    }

    process.stdout.write(this.game.draw());
  }

  handleGameInput(key: Buffer) {
    const char = key.toString();
    
    // Ignore input if waiting for leaderboard submission
    if (this.awaitingLeaderboardInput) {
      return;
    }
    
    // Ctrl+G, Ctrl+C, or Q to exit game
    if (key[0] === 7 || key[0] === 3 || char === 'q' || char === 'Q') {
      this.toggleGame();
      return;
    }

    if ((char === 'p' || char === 'P') && !this.game.isPlaying()) {
      this.startGame();
      return;
    }

    if (this.game.isPlaying()) {
      if (key[0] === 27 && key[1] === 91 && key[2] === 68 || char === 'a' || char === 'A') {
        this.game.movePaddleLeft();
        process.stdout.write(this.game.draw());
      }
      else if (key[0] === 27 && key[1] === 91 && key[2] === 67 || char === 'd' || char === 'D') {
        this.game.movePaddleRight();
        process.stdout.write(this.game.draw());
      }
    }
  }
}

const wrapper = new BrickBreakerGameWrapper();
wrapper.start();

process.on('SIGINT', () => {
  if (wrapper['ptyProcess']) {
    wrapper['ptyProcess'].kill();
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
});

process.on('exit', () => {
  if (wrapper['inGameMode']) {
    process.stdout.write('\x1b[?25h\x1b[?1049l');
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
});

process.on('uncaughtException', (err) => {
  if (wrapper['inGameMode']) {
    process.stdout.write('\x1b[?25h\x1b[?1049l');
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

