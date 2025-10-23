#!/usr/bin/env node

import { spawn } from 'child_process';
import terminalKit from 'terminal-kit';

const term = terminalKit.terminal;

let counter = 0;
let counterInterval: NodeJS.Timeout;
let bufferedOutput: string[] = [];
let isBuffering = false;

console.log('\x1b[36m%s\x1b[0m', '╔════════════════════════════════════════════════╗');
console.log('\x1b[36m%s\x1b[0m', '║   MAIN TERMINAL - Background Process Demo    ║');
console.log('\x1b[36m%s\x1b[0m', '╚════════════════════════════════════════════════╝');
console.log('');
console.log('This simulates a long-running process in the main terminal.');
console.log('The process CONTINUES running even when the game is active!');
console.log('');

// Start counter in main terminal
console.log('\x1b[32m✓ Starting background counter...\x1b[0m');
console.log('');

counterInterval = setInterval(() => {
  const now = new Date();
  const time = now.toLocaleTimeString();
  const line = `\x1b[33m⏱  Process counter: ${counter}\x1b[0m | Time: ${time} | Status: Running...`;
  
  if (isBuffering) {
    // Store output while game is running
    bufferedOutput.push(line);
  } else {
    // Display immediately
    console.log(line);
  }
  
  counter++;
}, 1000);

// After 3 seconds, show prompt to launch game
setTimeout(() => {
  console.log('');
  console.log('\x1b[35m%s\x1b[0m', '→ The counter above will keep running in the background');
  console.log('\x1b[35m%s\x1b[0m', '→ Press G to launch the GAME in alternate screen');
  console.log('\x1b[35m%s\x1b[0m', '→ Press Q to quit everything');
  console.log('');

  // Listen for keypress
  term.grabInput(true);
  
  term.on('key', (name: string) => {
    if (name === 'q' || name === 'CTRL_C') {
      clearInterval(counterInterval);
      term.grabInput(false);
      console.log('');
      console.log('\x1b[31m✗ Shutting down...\x1b[0m');
      process.exit(0);
    }

    if (name === 'g' || name === 'G') {
      // Start buffering counter output (process keeps running!)
      isBuffering = true;
      bufferedOutput = [];
      term.grabInput(false);
      
      console.log('\x1b[33m→ Process continues in background (output buffered)...\x1b[0m');
      console.log('\x1b[32m→ Launching game in alternate screen...\x1b[0m');
      console.log('');
      
      const game = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
      });

      game.on('close', () => {
        // Stop buffering
        isBuffering = false;
        
        // Game exited, we're back in main terminal
        console.log('');
        console.log('\x1b[32m✓ Game exited! Back to main terminal.\x1b[0m');
        console.log(`\x1b[32m✓ Process kept running! Showing ${bufferedOutput.length} buffered outputs:\x1b[0m`);
        console.log('');
        
        // Display all buffered output
        bufferedOutput.forEach(line => console.log(line));
        
        console.log('');
        console.log('\x1b[32m✓ Process continues running in real-time now...\x1b[0m');
        console.log('');
        console.log('\x1b[35m→ Press G to launch game again, Q to quit\x1b[0m');
        console.log('');
        
        term.grabInput(true);
      });
    }
  });
}, 3000);

// Handle exit
process.on('SIGINT', () => {
  clearInterval(counterInterval);
  term.grabInput(false);
  process.exit(0);
});

