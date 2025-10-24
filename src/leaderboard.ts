import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://odfgrwvrllfamevudjbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZmdyd3ZybGxmYW1ldnVkamJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjg3MzMsImV4cCI6MjA3NjgwNDczM30.GuWyElz-E4bSAhHAwfvfLBeih1Ni5dZ49sFk3qZLA_0'
);

export async function submitScore(gameId: 'brick_breaker' | 'snake', playerName: string, score: number): Promise<boolean> {
  try {
    // Only submit scores that are multiples of 10 (valid game scores)
    if (score % 10 !== 0) {
      console.error('Invalid score - must be multiple of 10');
      return false;
    }

    const snakeUUID = 'b14aedec-82a6-4538-aeae-9875460ba3b9'
    const brickBreakerUUID = '5b20731d-56d1-4cd7-b008-ddd84b2ca797'
    const gameUUID = gameId === 'snake' ? snakeUUID : brickBreakerUUID;

    const { error } = await supabase
    .from('leaderboard')
    .insert({
      game_id: gameUUID,  // ✅ Use game_id, not game_name
      player_name: playerName.trim(),
      score: score
    });

    if (error) {
      console.error('Error submitting score:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to submit score:', err);
    return false;
  }
}

export function promptForName(callback: (name: string | null, action: 'submit' | 'play' | 'quit') => void) {
  const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m';
  const BRIGHT_YELLOW = '\x1b[93m', WHITE = '\x1b[37m', BOLD = '\x1b[1m';
  
  process.stdout.write('\n\n');
  process.stdout.write(CYAN + '  ╔═══════════════════════════════════════════════════════╗\n' + RESET);
  process.stdout.write(CYAN + '  ║                                                       ║\n' + RESET);
  process.stdout.write(CYAN + '  ║  ' + RESET + BOLD + BRIGHT_YELLOW + '⚡ ⚡ ⚡  SUBMIT TO LEADERBOARD  ⚡ ⚡ ⚡' + RESET + CYAN + '    ║\n' + RESET);
  process.stdout.write(CYAN + '  ║                                                       ║\n' + RESET);
  process.stdout.write(CYAN + '  ╠═══════════════════════════════════════════════════════╣\n' + RESET);
  process.stdout.write(CYAN + '  ║                                                       ║\n' + RESET);
  process.stdout.write(CYAN + '  ║  ' + RESET + BOLD + WHITE + 'STEP 1:' + RESET + WHITE + ' Type your name below (max 20 chars)' + RESET + CYAN + '  ║\n' + RESET);
  process.stdout.write(CYAN + '  ║                                                       ║\n' + RESET);
  process.stdout.write(CYAN + '  ║  ' + RESET + BOLD + WHITE + 'STEP 2:' + RESET + WHITE + ' Press ENTER to submit your score' + RESET + CYAN + '     ║\n' + RESET);
  process.stdout.write(CYAN + '  ║                                                       ║\n' + RESET);
  process.stdout.write(CYAN + '  ║  ' + RESET + GREEN + '───────────────────────────────────────────' + RESET + CYAN + '      ║\n' + RESET);
  process.stdout.write(CYAN + '  ║  ' + RESET + GREEN + 'Skip: P (play) | Q or Ctrl+C (quit)' + RESET + CYAN + '        ║\n' + RESET);
  process.stdout.write(CYAN + '  ║                                                       ║\n' + RESET);
  process.stdout.write(CYAN + '  ╚═══════════════════════════════════════════════════════╝\n' + RESET);
  process.stdout.write('\n  ' + BOLD + BRIGHT_YELLOW + '👤 NAME: ' + RESET);
  
  let buffer = '';
  
  const nameHandler = (key: Buffer) => {
    const char = key.toString();
    
    if (key[0] === 13) { // Enter
      process.stdin.removeListener('data', nameHandler);
      process.stdout.write('\n');
      callback(buffer.trim() || null, 'submit');
    } else if (char === 'p' || char === 'P') {
      process.stdin.removeListener('data', nameHandler);
      process.stdout.write('\n');
      callback(null, 'play');
    } else if (char === 'q' || char === 'Q' || key[0] === 3) { // Q or Ctrl+C
      process.stdin.removeListener('data', nameHandler);
      process.stdout.write('\n');
      callback(null, 'quit');
    } else if (key[0] === 127 || key[0] === 8) { // Backspace
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
        process.stdout.write('\x1b[1D \x1b[1D'); // Move back, write space, move back
      }
    } else if (key[0] >= 32 && key[0] <= 126) { // Printable characters
      if (buffer.length < 20) {
        buffer += char;
        process.stdout.write(char);
      }
    }
  };
  
  process.stdin.on('data', nameHandler);
}


