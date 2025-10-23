#!/usr/bin/env node

import * as pty from 'node-pty';

class SnakeGameWrapper {
  private inGameMode = false;
  private ptyProcess: any = null;
  private gameLoop: NodeJS.Timeout | null = null;
  
  // Game state
  private snake: Array<{ x: number; y: number }> = [{ x: 10, y: 10 }];
  private food = { x: 15, y: 15 };
  private direction = { x: 1, y: 0 };
  private score = 0;
  private playing = false;
  private gameOver = false;
  
  // Game constants
  private readonly WIDTH = 40;
  private readonly HEIGHT = 20;

  start() {
    // Use node-pty to give Claude a real pseudo-terminal
    this.ptyProcess = pty.spawn('claude', process.argv.slice(2), {
      name: 'xterm-256color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd: process.cwd(),
      env: process.env as any
    });

    // Forward Claude's output to our terminal
    this.ptyProcess.onData((data: string) => {
      if (!this.inGameMode) {
        process.stdout.write(data);
      }
    });

    // Handle Claude exit
    this.ptyProcess.onExit(() => {
      if (this.inGameMode) {
        process.stdout.write('\x1b[?1049l');
      }
      process.exit(0);
    });

    // Handle terminal resize
    process.stdout.on('resize', () => {
      if (this.ptyProcess && !this.inGameMode) {
        this.ptyProcess.resize(process.stdout.columns || 80, process.stdout.rows || 24);
      }
    });

    this.setupInputHandling();
  }

  setupInputHandling() {
    process.stdin.setRawMode(true);
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
      process.stdout.write('\x1b[?1049h');
      process.stdout.write('\x1b[2J\x1b[?25l');
      
      this.inGameMode = true;
      this.showWelcome();
    } else {
      this.stopGame();
      
      process.stdout.write('\x1b[?25h');
      process.stdout.write('\x1b[?1049l');
      
      this.inGameMode = false;
    }
  }

  generateFood() {
    let newFood: { x: number; y: number };
    do {
      newFood = {
        x: Math.floor(Math.random() * this.WIDTH),
        y: Math.floor(Math.random() * this.HEIGHT)
      };
    } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    this.food = newFood;
  }

  resetGame() {
    this.snake = [{ x: Math.floor(this.WIDTH / 2), y: Math.floor(this.HEIGHT / 2) }];
    this.direction = { x: 1, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.generateFood();
  }

  startGame() {
    this.playing = true;
    this.resetGame();
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this.update(), 150);
  }

  stopGame() {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = null;
    this.playing = false;
  }

  update() {
    if (this.gameOver) return;

    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Wall collision
    if (head.x < 0 || head.x >= this.WIDTH || head.y < 0 || head.y >= this.HEIGHT) {
      this.endGame();
      return;
    }

    // Self collision
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.endGame();
      return;
    }

    this.snake.unshift(head);

    // Food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.generateFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  draw() {
    const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', RESET = '\x1b[0m';
    
    let output = '\x1b[1;1H' + YELLOW + `Score: ${this.score}` + RESET;

    for (let y = 0; y < this.HEIGHT; y++) {
      output += `\x1b[${y + 3};1H`;
      for (let x = 0; x < this.WIDTH; x++) {
        const isSnakeHead = this.snake[0].x === x && this.snake[0].y === y;
        const isSnakeBody = this.snake.slice(1).some(segment => segment.x === x && segment.y === y);
        const isFood = this.food.x === x && this.food.y === y;

        if (isSnakeHead) {
          output += GREEN + '●' + RESET;
        } else if (isSnakeBody) {
          output += GREEN + '█' + RESET;
        } else if (isFood) {
          output += RED + '♦' + RESET;
        } else {
          output += ' ';
        }
      }
    }

    output += `\x1b[${this.HEIGHT + 4};1H` + GREEN + 'Press P to play | WASD to move | Ctrl+G to exit' + RESET;
    process.stdout.write(output);
  }

  endGame() {
    this.gameOver = true;
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.playing = false;

    const RED = '\x1b[31m', YELLOW = '\x1b[33m', GREEN = '\x1b[32m', RESET = '\x1b[0m';
    
    let output = '\x1b[2J\x1b[10;1H';
    output += RED + '🐍 GAME OVER! 🐍\n\n' + RESET;
    output += YELLOW + `Final Score: ${this.score}\n` + RESET;
    output += YELLOW + `Snake Length: ${this.snake.length}\n\n` + RESET;
    output += GREEN + 'Press P to play again\n' + RESET;
    
    process.stdout.write(output);
  }

  showWelcome() {
    const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
    const output = '\x1b[2J\x1b[10;1H' + GREEN + '🐍 SNAKE GAME 🐍\n\n' + RESET + 
                   YELLOW + 'Press P to start!\n' + RESET;
    process.stdout.write(output);
  }

  handleGameInput(key: Buffer) {
    const char = key.toString();
    
    if (key[0] === 7) {
      this.toggleGame();
      return;
    }

    if (char === 'q' || char === 'Q') {
      this.toggleGame();
      return;
    }

    if ((char === 'p' || char === 'P') && !this.playing) {
      this.startGame();
      return;
    }

    if (this.playing && !this.gameOver) {
      // WASD movement
      if (char === 'w' || char === 'W') {
        if (this.direction.y !== 1) {
          this.direction = { x: 0, y: -1 };
        }
      } else if (char === 's' || char === 'S') {
        if (this.direction.y !== -1) {
          this.direction = { x: 0, y: 1 };
        }
      } else if (char === 'a' || char === 'A') {
        if (this.direction.x !== 1) {
          this.direction = { x: -1, y: 0 };
        }
      } else if (char === 'd' || char === 'D') {
        if (this.direction.x !== -1) {
          this.direction = { x: 1, y: 0 };
        }
      }
      // Arrow keys
      else if (key[0] === 27 && key[1] === 91) {
        if (key[2] === 65 && this.direction.y !== 1) { // Up
          this.direction = { x: 0, y: -1 };
        } else if (key[2] === 66 && this.direction.y !== -1) { // Down
          this.direction = { x: 0, y: 1 };
        } else if (key[2] === 68 && this.direction.x !== 1) { // Left
          this.direction = { x: -1, y: 0 };
        } else if (key[2] === 67 && this.direction.x !== -1) { // Right
          this.direction = { x: 1, y: 0 };
        }
      }
    }
  }
}

const wrapper = new SnakeGameWrapper();
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