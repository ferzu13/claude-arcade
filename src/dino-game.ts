#!/usr/bin/env node

// Suppress deprecation warnings from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') return;
  console.warn(warning);
});

import * as readline from 'readline';
import { DinoGame } from './games/dino';

const game = new DinoGame();
let gameLoop: NodeJS.Timeout | null = null;

// Hide cursor
process.stdout.write('\x1b[?25l');

function startGame() {
  game.start();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(() => {
    game.update();
    
    if (game.isGameOver()) {
      if (gameLoop) clearInterval(gameLoop);
      process.stdout.write(game.drawGameOver());
      process.stdout.write('\n\n\x1b[32mPress P to play again | Press Q to quit\x1b[0m\n');
      return;
    }

    process.stdout.write(game.draw());
  }, 50);
}

function cleanup() {
  if (gameLoop) clearInterval(gameLoop);
  process.stdout.write('\x1b[?25h'); // Show cursor
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
}

// Show welcome screen
process.stdout.write(game.drawWelcome());

// Set up keyboard input
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);

  process.stdin.on('keypress', (_str: string, key: any) => {
    if (!key) return;

    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      cleanup();
      process.exit(0);
    }

    if (key.name === 'p' && !game.isPlaying()) {
      startGame();
    }

    if (game.isPlaying() && !game.isGameOver()) {
      if (key.name === 'up' || key.name === 'space') {
        game.jump();
      } else if (key.name === 'down' || key.name === 's') {
        game.duck(true);
      } else {
        game.duck(false);
      }
    }
  });
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('exit', cleanup);

process.on('uncaughtException', (err) => {
  cleanup();
  console.error('Uncaught exception:', err);
  process.exit(1);
});



