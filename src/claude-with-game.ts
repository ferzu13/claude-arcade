#!/usr/bin/env node

import * as pty from 'node-pty';
import { spawn } from 'child_process';
import * as readline from 'readline';

let ptyProcess: any = null;
let gameProcess: any = null;
let gameActive = false;

// Start Claude in a pseudo-terminal (virtual terminal)
// This gives Claude the full terminal control it needs
ptyProcess = pty.spawn('claude', process.argv.slice(2), {
  name: 'xterm-color',
  cols: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
  cwd: process.cwd(),
  env: process.env as any
});

// Forward Claude's output to our terminal
ptyProcess.onData((data: string) => {
  process.stdout.write(data);
});

// Handle terminal resize
process.stdout.on('resize', () => {
  if (ptyProcess && !gameActive) {
    ptyProcess.resize(process.stdout.columns || 80, process.stdout.rows || 24);
  }
});

// Set up keyboard input handling
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);

  process.stdin.on('keypress', (str: string, key: any) => {
    if (gameActive) return; // Ignore input while game is running

    // Check for Ctrl+G
    if (key && key.ctrl && key.name === 'g') {
      launchGame();
      return;
    }

    // Forward everything else to Claude's PTY
    if (ptyProcess) {
      const data = key?.sequence || str;
      if (data) ptyProcess.write(data);
    }
  });
}

// Clean up on Claude exit
ptyProcess.onExit(() => {
  cleanup();
  process.exit(0);
});

function launchGame() {
  if (gameActive) return;

  gameActive = true;
  
  // Stop forwarding input to Claude
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.removeAllListeners('keypress');

  // Launch the game
  gameProcess = spawn('npm', ['start'], {
    stdio: 'inherit',
    cwd: __dirname + '/..'
  });

  gameProcess.on('close', () => {
    gameActive = false;
    gameProcess = null;

    // Resume keyboard handling
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      // Re-setup keypress since we removed all listeners
      readline.emitKeypressEvents(process.stdin);
      
      process.stdin.on('keypress', (str: string, key: any) => {
        if (gameActive) return;

        if (key && key.ctrl && key.name === 'g') {
          launchGame();
          return;
        }

        if (ptyProcess) {
          const data = key?.sequence || str;
          if (data) ptyProcess.write(data);
        }
      });
    }
  });
}

function cleanup() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  if (ptyProcess) {
    ptyProcess.kill();
  }
  if (gameProcess) {
    gameProcess.kill();
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('exit', cleanup);

