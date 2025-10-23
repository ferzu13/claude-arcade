#!/usr/bin/env node

import * as pty from 'node-pty';

class ClaudeCodeWrapper {
  private inGameMode = false;
  private ptyProcess: any = null;
  private gameLoop: NodeJS.Timeout | null = null;
  private outputBuffer: string[] = [];
  
  // Game state
  private ball = { x: 25, y: 10, vx: 1, vy: 1 };
  private paddle = { x: 21 };
  private blocks: Array<{ x: number; y: number; active: boolean; color: string }> = [];
  private score = 0;
  private playing = false;
  
  // Game constants
  private readonly WIDTH = 50;
  private readonly HEIGHT = 20;
  private readonly PADDLE_WIDTH = 7;

  start() {
    // Use node-pty to give Claude a real pseudo-terminal
    this.ptyProcess = pty.spawn('claude', process.argv.slice(2), {
      name: 'xterm-256color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd: process.cwd(),
      env: process.env as any
    });

    // Forward Claude's output - buffer during game mode
    let totalBytesReceived = 0;
    let bufferedBytes = 0;
    
    this.ptyProcess.onData((data: string) => {
      totalBytesReceived += data.length;
      
      if (this.inGameMode) {
        // Buffer output during game
        this.outputBuffer.push(data);
        bufferedBytes += data.length;
        
        // Warn if buffer gets large
        if (bufferedBytes > 50000) { // 50KB threshold
          console.error(`[PTY MONITOR] Buffer large: ${bufferedBytes} bytes buffered`);
        }
      } else {
        // Direct output when not in game
        process.stdout.write(data);
      }
    });

    // Handle Claude exit
    this.ptyProcess.onExit(({ exitCode, signal }: any) => {
      if (this.inGameMode) {
        process.stdout.write('\x1b[?1049l'); // Exit alternate screen
      }
      
      // Log unexpected exits
      if (signal) {
        console.error(`[PTY MONITOR] Claude killed by signal: ${signal}`);
      }
      
      process.exit(exitCode || 0);
    });
    
    // Monitor for PTY errors
    this.ptyProcess.on('error', (err: Error) => {
      console.error('[PTY ERROR]', err);
    });

    // Handle terminal resize
    process.stdout.on('resize', () => {
      if (this.ptyProcess && !this.inGameMode) {
        this.ptyProcess.resize(process.stdout.columns || 80, process.stdout.rows || 24);
      }
    });

    // Set up input handling
    this.setupInputHandling();
  }

  setupInputHandling() {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('data', (key: Buffer) => {
      // Ctrl+G detection (ASCII code 7)
      if (key[0] === 7) {
        this.toggleGame();
        return;
      }

      if (this.inGameMode) {
        this.handleGameInput(key);
      } else {
        // Forward all input to Claude's PTY
        if (this.ptyProcess) {
          this.ptyProcess.write(key);
        }
      }
    });
  }

  toggleGame() {
    if (!this.inGameMode) {
      // ===== ENTERING GAME MODE =====
      process.stdout.write('\x1b[?1049h'); // Switch to alternate screen
      process.stdout.write('\x1b[2J\x1b[?25l'); // Clear and hide cursor
      
      this.inGameMode = true;
      this.showWelcome();
      // Claude continues running, output buffered in memory
    } else {
      // ===== EXITING GAME MODE =====
      this.stopGame();
      
      process.stdout.write('\x1b[?25h'); // Show cursor
      process.stdout.write('\x1b[?1049l'); // Switch back to main screen
      
      this.inGameMode = false;
      
      // Flush all buffered output
      if (this.outputBuffer.length > 0) {
        for (const data of this.outputBuffer) {
          process.stdout.write(data);
        }
        this.outputBuffer = []; // Clear buffer
      }
      
      // Send Ctrl+L to refresh Claude's display
      setTimeout(() => {
        if (this.ptyProcess) {
          this.ptyProcess.write('\x0C'); // Ctrl+L refresh
        }
      }, 100);
    }
  }

  // ===== GAME IMPLEMENTATION =====

  initBlocks() {
    this.blocks = [];
    const colors = ['red', 'yellow', 'green', 'magenta'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 10; col++) {
        this.blocks.push({
          x: col * 5,
          y: row + 2,
          active: true,
          color: colors[row],
        });
      }
    }
  }

  resetGame() {
    this.ball = {
      x: Math.floor(this.WIDTH * 0.3 + Math.random() * this.WIDTH * 0.4),
      y: this.HEIGHT - 5,
      vx: Math.random() > 0.5 ? 1 : -1,
      vy: -1,
    };
    this.paddle = { x: this.WIDTH / 2 - this.PADDLE_WIDTH / 2 };
    this.score = 0;
    this.initBlocks();
  }

  startGame() {
    this.playing = true;
    this.resetGame();
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.update(), 100);
  }

  stopGame() {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = null;
    this.playing = false;
  }

  update() {
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Wall bounce
    if (this.ball.x <= 0 || this.ball.x >= this.WIDTH - 1) {
      this.ball.vx *= -1;
      this.ball.x = Math.max(0, Math.min(this.WIDTH - 1, this.ball.x));
    }
    if (this.ball.y <= 0) {
      this.ball.vy *= -1;
      this.ball.y = 0;
    }

    // Paddle hit
    const ballX = Math.round(this.ball.x);
    const ballY = Math.round(this.ball.y);

    if (ballY >= this.HEIGHT - 2 && ballX >= this.paddle.x && 
        ballX < this.paddle.x + this.PADDLE_WIDTH && this.ball.vy > 0) {
      this.ball.vy *= -1;
      const hitPos = (this.ball.x - this.paddle.x) / this.PADDLE_WIDTH;
      if (hitPos < 0.3) this.ball.vx = -1;
      else if (hitPos > 0.7) this.ball.vx = 1;
    }

    // Block hit
    for (const block of this.blocks) {
      if (!block.active) continue;
      if (ballX >= block.x && ballX < block.x + 5 && ballY === block.y) {
        block.active = false;
        this.ball.vy *= -1;
        this.score += 10;
        break;
      }
    }

    // Win/Lose
    if (this.blocks.every(b => !b.active)) {
      this.endGame(true);
      return;
    }
    if (this.ball.y >= this.HEIGHT) {
      this.endGame(false);
      return;
    }

    this.draw();
  }

  draw() {
    const YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RED = '\x1b[31m';
    const GREEN = '\x1b[32m', MAGENTA = '\x1b[35m', RESET = '\x1b[0m';
    
    const colors: { [key: string]: string } = { red: RED, yellow: YELLOW, green: GREEN, magenta: MAGENTA };
    
    let output = '\x1b[1;1H' + YELLOW + `Score: ${this.score}` + RESET;

    const ballX = Math.round(this.ball.x);
    const ballY = Math.round(this.ball.y);
    const paddleY = this.HEIGHT - 2;

    for (let y = 0; y < this.HEIGHT; y++) {
      output += `\x1b[${y + 3};1H`;
      for (let x = 0; x < this.WIDTH; x++) {
        const block = this.blocks.find(b => b.active && y === b.y && x >= b.x && x < b.x + 5);
        const isBall = ballX === x && ballY === y;
        const isPaddle = y === paddleY && x >= this.paddle.x && x < this.paddle.x + this.PADDLE_WIDTH;

        if (block) {
          output += colors[block.color] + '█' + RESET;
        } else if (isBall) {
          output += YELLOW + '●' + RESET;
        } else if (isPaddle) {
          output += CYAN + '═' + RESET;
        } else {
          output += ' ';
        }
      }
    }

    output += `\x1b[${this.HEIGHT + 4};1H` + GREEN + 'Press P to play | ←→ to move | Ctrl+G to exit' + RESET;
    process.stdout.write(output);
  }

  endGame(won: boolean) {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.playing = false;

    const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
    
    let output = '\x1b[2J\x1b[10;1H';
    if (won) {
      output += GREEN + '🎉 YOU WIN! 🎉\n\n' + RESET;
    } else {
      output += RED + '💀 GAME OVER! 💀\n\n' + RESET;
    }
    output += YELLOW + `Final Score: ${this.score}\n\n` + RESET;
    output += GREEN + 'Press P to play again\n' + RESET;
    
    process.stdout.write(output);
  }

  showWelcome() {
    const CYAN = '\x1b[36m', GREEN = '\x1b[32m', RESET = '\x1b[0m';
    const output = '\x1b[2J\x1b[10;1H' + CYAN + 'BREAKOUT GAME\n\n' + RESET + 
                   GREEN + 'Press P to start!\n' + RESET;
    process.stdout.write(output);
  }

  handleGameInput(key: Buffer) {
    const char = key.toString();
    
    // Ctrl+G to exit game
    if (key[0] === 7) {
      this.toggleGame();
      return;
    }

    // Q to exit game
    if (char === 'q' || char === 'Q') {
      this.toggleGame();
      return;
    }

    // P to start
    if ((char === 'p' || char === 'P') && !this.playing) {
      this.startGame();
      return;
    }

    // Paddle movement
    if (this.playing) {
      // Left arrow or 'a'
      if (key[0] === 27 && key[1] === 91 && key[2] === 68 || char === 'a' || char === 'A') {
        this.paddle.x = Math.max(0, this.paddle.x - 5);
        this.draw();
      }
      // Right arrow or 'd'
      else if (key[0] === 27 && key[1] === 91 && key[2] === 67 || char === 'd' || char === 'D') {
        this.paddle.x = Math.min(this.WIDTH - this.PADDLE_WIDTH, this.paddle.x + 5);
        this.draw();
      }
    }
  }
}

// ===== STARTUP =====

const wrapper = new ClaudeCodeWrapper();
wrapper.start();

// ===== SIGNAL HANDLING =====

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
    process.stdout.write('\x1b[?25h\x1b[?1049l'); // Show cursor, exit alt screen
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
