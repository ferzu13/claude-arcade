#!/usr/bin/env node

// Simple counter in main terminal to test alternate screen
// This will keep printing to the main terminal every second

let counter = 0;

console.log('\x1b[36m%s\x1b[0m', '╔═══════════════════════════════════╗');
console.log('\x1b[36m%s\x1b[0m', '║  Main Terminal Counter Running   ║');
console.log('\x1b[36m%s\x1b[0m', '╚═══════════════════════════════════╝');
console.log('');
console.log('This counter proves the main terminal keeps running');
console.log('while the game runs in the alternate screen buffer.');
console.log('');

setInterval(() => {
  const now = new Date();
  const time = now.toLocaleTimeString();
  console.log(`\x1b[33m⏱  Counter: ${counter}\x1b[0m | Time: ${time}`);
  counter++;
}, 1000);

console.log('\x1b[32m✓ Counter started!\x1b[0m');
console.log('\x1b[32m→ Run "npm run dev" in another terminal to test the game\x1b[0m');
console.log('\x1b[32m→ Or press Ctrl+C to stop this counter\x1b[0m');
console.log('');

