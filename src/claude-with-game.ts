#!/usr/bin/env node

// Suppress deprecation warnings from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') return;
  console.warn(warning);
});

import * as pty from 'node-pty';
import { BrickBreakerGame } from './games/brick-breaker';
import { SnakeGame } from './games/snake';
import { submitScore, promptForName } from './leaderboard';

// ===== CLI ARGUMENT PARSING =====

function parseArgs(): { help: boolean; snake: boolean; claudeArgs: string[] } {
  const args = process.argv.slice(2);
  let help = false;
  let snake = false;
  const claudeArgs: string[] = [];

  for (const arg of args) {
    const cleanArg = arg.replace(/^-+/, '');
    
    if (cleanArg === 'h' || cleanArg === 'help') {
      help = true;
    } else if (cleanArg === 'snake') {
      snake = true;
    } else {
      claudeArgs.push(arg);
    }
  }

  return { help, snake, claudeArgs };
}

function showHelp() {
  const CYAN = '\x1b[36m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
  
  console.log(`
${CYAN}Claude Arcade${RESET} - Add games to your Claude Code workflow!

${GREEN}Usage:${RESET}
  claude-g           Start Claude with Brick Breaker game
  claude-g -snake    Start Claude with Snake game
  claude-g -help     Show this help

${GREEN}Controls:${RESET}
  Ctrl+G    Toggle game overlay
  Q         Exit game back to Claude

${GREEN}Games:${RESET}
  ${YELLOW}•${RESET} Brick Breaker - Break bricks with strength levels (default)
  ${YELLOW}•${RESET} Snake         - Classic snake game

${GREEN}Examples:${RESET}
  claude-g                    # Start with Brick Breaker
  claude-g -snake             # Start with Snake
  claude-g --snake            # Also works with double dash
  claude-g -snake --model gpt # Pass args to Claude

${GREEN}More info:${RESET}
  https://github.com/yourusername/claude-arcade
`);
  process.exit(0);
}

// ===== GAME WRAPPER BASE CLASS =====

class GameWrapper<T extends BrickBreakerGame | SnakeGame> {
  protected inGameMode = false;
  protected ptyProcess: any = null;
  protected gameLoop: NodeJS.Timeout | null = null;
  protected outputBuffer: string[] = [];
  protected game: T;
  protected updateInterval: number;
  protected gameId: 'brick_breaker' | 'snake';
  protected awaitingLeaderboardInput = false;

  constructor(game: T, updateInterval: number = 100, gameId: 'brick_breaker' | 'snake') {
    this.game = game;
    this.updateInterval = updateInterval;
    this.gameId = gameId;
  }

  start(claudeArgs: string[] = []) {
    this.ptyProcess = pty.spawn('claude', claudeArgs, {
      name: 'xterm-256color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd: process.cwd(),
      env: process.env as any
    });

    let totalBytesReceived = 0;
    let bufferedBytes = 0;
    
    this.ptyProcess.onData((data: string) => {
      totalBytesReceived += data.length;
      
      if (this.inGameMode) {
        this.outputBuffer.push(data);
        bufferedBytes += data.length;
      } else {
        process.stdout.write(data);
      }
    });

    this.ptyProcess.onExit(({ exitCode, signal }: any) => {
      if (this.inGameMode) {
        process.stdout.write('\x1b[?1049l');
      }
      process.exit(exitCode || 0);
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
      if (key[0] === 7) { // Ctrl+G
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
      
      if (this.outputBuffer.length > 0) {
        for (const data of this.outputBuffer) {
          process.stdout.write(data);
        }
        this.outputBuffer = [];
      }
      
      setTimeout(() => {
        if (this.ptyProcess) {
          this.ptyProcess.write('\x0C');
        }
      }, 100);
    }
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
        const success = await submitScore(this.gameId, name, this.game.getScore());
        
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

    this.handleSpecificGameInput(key);
  }

  startGame() {
    this.game.start();
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.update(), this.updateInterval);
  }

  update() {
    // To be implemented by subclasses
  }

  handleSpecificGameInput(key: Buffer) {
    // To be implemented by subclasses
  }
}

// ===== BRICK BREAKER WRAPPER =====

class BrickBreakerWrapper extends GameWrapper<BrickBreakerGame> {
  constructor() {
    super(new BrickBreakerGame(), 100, 'brick_breaker');
  }

  update() {
    const result = this.game.update();
    
    if (result.won !== undefined || result.lost !== undefined) {
      this.handleGameOver(this.game.drawGameOver(result.won || false));
      return;
    }

    process.stdout.write(this.game.draw());
  }

  handleSpecificGameInput(key: Buffer) {
    if (!this.game.isPlaying()) return;

    const char = key.toString();
    
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

// ===== SNAKE WRAPPER =====

class SnakeWrapper extends GameWrapper<SnakeGame> {
  constructor() {
    super(new SnakeGame(), 150, 'snake');
  }

  update() {
    this.game.update();
    
    if (this.game.isGameOver()) {
      this.handleGameOver(this.game.drawGameOver());
      return;
    }

    process.stdout.write(this.game.draw());
  }

  handleSpecificGameInput(key: Buffer) {
    if (!this.game.isPlaying() || this.game.isGameOver()) return;

    const char = key.toString();
    
    if (char === 'w' || char === 'W') {
      this.game.setDirection(0, -1);
    } else if (char === 's' || char === 'S') {
      this.game.setDirection(0, 1);
    } else if (char === 'a' || char === 'A') {
      this.game.setDirection(-1, 0);
    } else if (char === 'd' || char === 'D') {
      this.game.setDirection(1, 0);
    }
    else if (key[0] === 27 && key[1] === 91) {
      if (key[2] === 65) { // Up
        this.game.setDirection(0, -1);
      } else if (key[2] === 66) { // Down
        this.game.setDirection(0, 1);
      } else if (key[2] === 68) { // Left
        this.game.setDirection(-1, 0);
      } else if (key[2] === 67) { // Right
        this.game.setDirection(1, 0);
      }
    }
  }
}

// ===== STARTUP =====

const { help, snake, claudeArgs } = parseArgs();

if (help) {
  showHelp();
}

const wrapper = snake ? new SnakeWrapper() : new BrickBreakerWrapper();
wrapper.start(claudeArgs);

// ===== SIGNAL HANDLING =====

process.on('SIGINT', () => {
  if ((wrapper as any).ptyProcess) {
    (wrapper as any).ptyProcess.kill();
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
});

process.on('exit', () => {
  if ((wrapper as any).inGameMode) {
    process.stdout.write('\x1b[?25h\x1b[?1049l');
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
});

process.on('uncaughtException', (err) => {
  if ((wrapper as any).inGameMode) {
    process.stdout.write('\x1b[?25h\x1b[?1049l');
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

