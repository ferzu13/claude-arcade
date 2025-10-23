#!/usr/bin/env node

import * as readline from 'readline';

// ANSI escape codes
const CLEAR = '\x1b[2J';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const MAGENTA = '\x1b[35m';
const ALT_SCREEN = '\x1b[?1049h'; // Switch to alternate screen
const MAIN_SCREEN = '\x1b[?1049l'; // Switch back to main screen

function moveTo(x: number, y: number): string {
  return `\x1b[${y};${x}H`;
}

// Game settings
const WIDTH = 50;
const HEIGHT = 20;
const PADDLE_WIDTH = 7;

// Game state
let ball = { x: 25, y: 10, vx: 1, vy: 1 };
let paddle = { x: 21 };
let blocks: Array<{ x: number; y: number; active: boolean; color: string }> = [];
let score = 0;
let playing = false;
let gameLoop: NodeJS.Timeout | null = null;

// Color map
const colors: { [key: string]: string } = {
  red: RED,
  yellow: YELLOW,
  green: GREEN,
  magenta: MAGENTA,
};

// Initialize
process.stdout.write(ALT_SCREEN + HIDE_CURSOR + CLEAR);

// Create blocks
function initBlocks() {
  blocks = [];
  const colorNames = ['red', 'yellow', 'green', 'magenta'];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      blocks.push({
        x: col * 5,
        y: row + 2,
        active: true,
        color: colorNames[row],
      });
    }
  }
}

// Reset game
function reset() {
  ball = {
    x: Math.floor(WIDTH * 0.3 + Math.random() * WIDTH * 0.4),
    y: HEIGHT - 5,
    vx: Math.random() > 0.5 ? 1 : -1,
    vy: -1,
  };
  paddle = { x: WIDTH / 2 - PADDLE_WIDTH / 2 };
  score = 0;
  initBlocks();
}

// Start game
function start() {
  playing = true;
  reset();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 100);
}

// Game loop
function update() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce
  if (ball.x <= 0 || ball.x >= WIDTH - 1) {
    ball.vx *= -1;
    ball.x = Math.max(0, Math.min(WIDTH - 1, ball.x));
  }
  if (ball.y <= 0) {
    ball.vy *= -1;
    ball.y = 0;
  }

  // Paddle hit
  const ballX = Math.round(ball.x);
  const ballY = Math.round(ball.y);

  if (ballY >= HEIGHT - 2 && ballX >= paddle.x && ballX < paddle.x + PADDLE_WIDTH && ball.vy > 0) {
    ball.vy *= -1;
    const hitPos = (ball.x - paddle.x) / PADDLE_WIDTH;
    if (hitPos < 0.3) ball.vx = -1;
    else if (hitPos > 0.7) ball.vx = 1;
  }

  // Block hit
  for (const block of blocks) {
    if (!block.active) continue;
    if (ballX >= block.x && ballX < block.x + 5 && ballY === block.y) {
      block.active = false;
      ball.vy *= -1;
      score += 10;
      break;
    }
  }

  // Win/Lose
  if (blocks.every(b => !b.active)) {
    endGame(true);
    return;
  }
  if (ball.y >= HEIGHT) {
    endGame(false);
    return;
  }

  draw();
}

// Draw game - optimized
function draw() {
  let output = moveTo(1, 1) + YELLOW + `Score: ${score}` + RESET;

  const ballX = Math.round(ball.x);
  const ballY = Math.round(ball.y);
  const paddleY = HEIGHT - 2;

  for (let y = 0; y < HEIGHT; y++) {
    output += moveTo(1, y + 3);
    let line = '';

    for (let x = 0; x < WIDTH; x++) {
      const block = blocks.find(b => b.active && y === b.y && x >= b.x && x < b.x + 5);
      const isBall = ballX === x && ballY === y;
      const isPaddle = y === paddleY && x >= paddle.x && x < paddle.x + PADDLE_WIDTH;

      if (block) {
        line += colors[block.color] + '█' + RESET;
      } else if (isBall) {
        line += YELLOW + '●' + RESET;
      } else if (isPaddle) {
        line += CYAN + '═' + RESET;
      } else {
        line += ' ';
      }
    }
    output += line;
  }

  output += moveTo(1, HEIGHT + 4) + GREEN + 'Press P to play | ←→ to move | Q to quit' + RESET;
  process.stdout.write(output);
}

// Fast paddle redraw - single write!
function drawPaddleOnly() {
  const paddleY = HEIGHT - 2;
  const ballX = Math.round(ball.x);
  const ballY = Math.round(ball.y);

  let line = '';
  for (let x = 0; x < WIDTH; x++) {
    const isBall = ballX === x && ballY === paddleY;
    const isPaddle = x >= paddle.x && x < paddle.x + PADDLE_WIDTH;

    if (isBall) {
      line += YELLOW + '●' + RESET;
    } else if (isPaddle) {
      line += CYAN + '═' + RESET;
    } else {
      line += ' ';
    }
  }

  process.stdout.write(moveTo(1, paddleY + 3) + line);
}

// End game
function endGame(won: boolean) {
  if (gameLoop) clearInterval(gameLoop);
  playing = false;

  let output = CLEAR + moveTo(1, 10);
  if (won) {
    output += GREEN + '🎉 YOU WIN! 🎉\n\n' + RESET;
  } else {
    output += RED + '💀 GAME OVER! 💀\n\n' + RESET;
  }
  output += YELLOW + `Final Score: ${score}\n\n` + RESET;
  output += GREEN + 'Press P to play again\n' + RESET;
  
  process.stdout.write(output);
}

// Show welcome
function showWelcome() {
  const output = CLEAR + moveTo(1, 10) + CYAN + 'BREAKOUT GAME\n\n' + RESET + GREEN + 'Press P to start!\n' + RESET;
  process.stdout.write(output);
}

// Cleanup
function cleanup() {
  if (gameLoop) clearInterval(gameLoop);
  process.stdout.write(SHOW_CURSOR + MAIN_SCREEN);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
}

// Keyboard input
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);

  process.stdin.on('keypress', (_str: string, key: any) => {
    if (!key) return;

    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      cleanup();
      process.exit(0);
    }

    if (key.name === 'p' && !playing) {
      start();
    }

    if (playing) {
      if (key.name === 'left' || key.name === 'a') {
        paddle.x = Math.max(0, paddle.x - 5);
        drawPaddleOnly();
      } else if (key.name === 'right' || key.name === 'd') {
        paddle.x = Math.min(WIDTH - PADDLE_WIDTH, paddle.x + 5);
        drawPaddleOnly();
      }
    }
  });
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('exit', cleanup);

// Start
showWelcome();
