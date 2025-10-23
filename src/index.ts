#!/usr/bin/env node

import terminalKit from "terminal-kit";

const term = terminalKit.terminal;

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

// Initialize - use alternate screen buffer
term.fullscreen(true); // This switches to alternate screen
term.grabInput(true);
term.hideCursor();
term.clear();

// Create blocks
function initBlocks() {
  blocks = [];
  const colors = ['red', 'yellow', 'green', 'magenta'];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      blocks.push({
        x: col * 5,
        y: row + 2,
        active: true,
        color: colors[row],
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
  gameLoop = setInterval(update, 80);
}

// Game loop
function update() {
  // Move ball
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

// Draw game
function draw() {
  term.moveTo(1, 1);
  term.eraseLine();
  term.yellow.bold(`Score: ${score}`);

  // Draw game area
  for (let y = 0; y < HEIGHT; y++) {
    term.moveTo(1, y + 3);
    
    for (let x = 0; x < WIDTH; x++) {
      // Find what to draw
      const block = blocks.find(b => b.active && y === b.y && x >= b.x && x < b.x + 5);
      const isBall = Math.round(ball.x) === x && Math.round(ball.y) === y;
      const isPaddle = y === HEIGHT - 2 && x >= paddle.x && x < paddle.x + PADDLE_WIDTH;

      if (block) {
        (term as any)[block.color]('█');
      } else if (isBall) {
        term.yellow('●');
      } else if (isPaddle) {
        term.cyan('═');
      } else {
        term(' ');
      }
    }
  }

  term.moveTo(1, HEIGHT + 4);
  term.eraseLine();
  term.green('Press P to play | ←→ to move | Q to quit');
}

// End game
function endGame(won: boolean) {
  if (gameLoop) clearInterval(gameLoop);
  playing = false;

  term.clear();
  term.moveTo(1, 10);
  
  if (won) {
    term.green.bold('🎉 YOU WIN! 🎉\n\n');
  } else {
    term.red.bold('💀 GAME OVER! 💀\n\n');
  }
  
  term.yellow(`Final Score: ${score}\n\n`);
  term.green('Press P to play again\n');
}

// Show welcome
function showWelcome() {
  term.clear();
  term.moveTo(1, 10);
  term.cyan.bold('BREAKOUT GAME\n\n');
  term.green('Press P to start!\n');
}

// Cleanup - restore terminal
function cleanup() {
  if (gameLoop) clearInterval(gameLoop);
  term.grabInput(false);
  term.hideCursor(false);
  term.fullscreen(false); // Exit alternate screen - DON'T clear after this!
}

// Keyboard
term.on('key', (name: string) => {
  if (name === 'q' || name === 'CTRL_C') {
    cleanup();
    process.exit(0);
  }

  if (name === 'p' && !playing) {
    start();
  }

  if (playing) {
    if (name === 'LEFT') {
      paddle.x = Math.max(0, paddle.x - 3);
    } else if (name === 'RIGHT') {
      paddle.x = Math.min(WIDTH - PADDLE_WIDTH, paddle.x + 3);
    }
  }
});

// Start
showWelcome();

// Keep alive
setInterval(() => {}, 1000);

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('exit', () => {
  cleanup();
});
