export class BrickBreakerGame {
  private ball = { x: 25, y: 10, vx: 0.7, vy: 0.8 };
  private paddle = { x: 21 };
  private blocks: Array<{ x: number; y: number; strength: number }> = [];
  private score = 0;
  private playing = false;
  
  private readonly WIDTH = 50;
  private readonly HEIGHT = 20;
  private readonly PADDLE_WIDTH = 7;

  // Strength levels: 4=red, 3=magenta, 2=yellow, 1=cyan
  private readonly STRENGTH_COLORS: { [key: number]: string } = {
    4: '\x1b[31m', // Red
    3: '\x1b[35m', // Magenta  
    2: '\x1b[33m', // Yellow
    1: '\x1b[36m'  // Cyan
  };

  isPlaying(): boolean {
    return this.playing;
  }

  getScore(): number {
    return this.score;
  }

  initBlocks() {
    this.blocks = [];
    // Create 4 rows of blocks with different initial strengths
    for (let row = 0; row < 4; row++) {
      const strength = 4 - row; // Top row strongest (4), bottom weakest (1)
      for (let col = 0; col < 10; col++) {
        this.blocks.push({
          x: col * 5,
          y: row,
          strength: strength
        });
      }
    }
  }

  reset() {
    this.ball = { x: 25, y: 10, vx: 1, vy: -1 };
    this.paddle = { x: 21 };
    this.score = 0;
    this.initBlocks();
  }

  start() {
    this.playing = true;
    this.reset();
  }

  stop() {
    this.playing = false;
  }

  update(): { won?: boolean; lost?: boolean } {
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Wall bounce - simple and predictable
    if (this.ball.x <= 0 || this.ball.x >= this.WIDTH - 1) {
      this.ball.vx *= -1;
      this.ball.x = Math.max(0, Math.min(this.WIDTH - 1, this.ball.x));
    }
    
    // Top wall bounce
    if (this.ball.y <= 0) {
      this.ball.vy *= -1;
      this.ball.y = 0;
    }

    const ballX = Math.round(this.ball.x);
    const ballY = Math.round(this.ball.y);

    // Paddle hit
    if (ballY >= this.HEIGHT - 2 && ballX >= this.paddle.x && 
        ballX < this.paddle.x + this.PADDLE_WIDTH && this.ball.vy > 0) {
      this.ball.vy *= -1;
      
      // Adjust horizontal speed based on where ball hits paddle
      const hitPos = (this.ball.x - this.paddle.x) / this.PADDLE_WIDTH;
      if (hitPos < 0.35) {
        this.ball.vx = -1;  // Hit left side, go left
      } else if (hitPos > 0.65) {
        this.ball.vx = 1;   // Hit right side, go right
      }
      // Middle hits keep current horizontal velocity
      
      this.ball.y = this.HEIGHT - 3;
    }

    // Block collision
    for (const block of this.blocks) {
      if (block.strength === 0) continue;
      
      if (ballX >= block.x && ballX < block.x + 5 && ballY === block.y) {
        block.strength--;
        this.ball.vy *= -1;
        this.score += (5 - block.strength) * 10; // More points for stronger blocks
        break;
      }
    }

    // Win/Lose
    if (this.blocks.every(b => b.strength === 0)) {
      this.playing = false;
      return { won: true };
    }
    if (this.ball.y >= this.HEIGHT) {
      this.playing = false;
      return { lost: true };
    }

    return {};
  }

  movePaddleLeft() {
    this.paddle.x = Math.max(0, this.paddle.x - 5);
  }

  movePaddleRight() {
    this.paddle.x = Math.min(this.WIDTH - this.PADDLE_WIDTH, this.paddle.x + 5);
  }

  draw(): string {
    const YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m';
    const GREEN = '\x1b[32m', WHITE = '\x1b[37m';
    
    let output = '\x1b[2J\x1b[1;1H' + YELLOW + `Score: ${this.score}` + RESET;

    const ballX = Math.round(this.ball.x);
    const ballY = Math.round(this.ball.y);
    const paddleY = this.HEIGHT - 2;

    // Top border
    output += `\x1b[2;1H` + WHITE + '┌' + '─'.repeat(this.WIDTH) + '┐' + RESET;

    for (let y = 0; y < this.HEIGHT; y++) {
      output += `\x1b[${y + 3};1H` + WHITE + '│' + RESET;
      for (let x = 0; x < this.WIDTH; x++) {
        const block = this.blocks.find(b => b.strength > 0 && y === b.y && x >= b.x && x < b.x + 5);
        const isBall = ballX === x && ballY === y;
        const isPaddle = y === paddleY && x >= this.paddle.x && x < this.paddle.x + this.PADDLE_WIDTH;

        if (block) {
          output += this.STRENGTH_COLORS[block.strength] + '█' + RESET;
        } else if (isBall) {
          output += YELLOW + '●' + RESET;
        } else if (isPaddle) {
          output += CYAN + '═' + RESET;
        } else {
          output += ' ';
        }
      }
      output += WHITE + '│' + RESET;
    }

    // Bottom border
    output += `\x1b[${this.HEIGHT + 3};1H` + WHITE + '└' + '─'.repeat(this.WIDTH) + '┘' + RESET;

    output += `\x1b[${this.HEIGHT + 5};1H` + GREEN + 'Q/Ctrl+C: Exit | ←→ or A/D: Move | P: Restart' + RESET;
    return output;
  }

  drawGameOver(won: boolean): string {
    const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
    
    let output = '\x1b[2J\x1b[10;1H';
    if (won) {
      output += GREEN + '🎉 YOU WIN! 🎉\n\n' + RESET;
    } else {
      output += RED + '💀 GAME OVER! 💀\n\n' + RESET;
    }
    output += YELLOW + `Final Score: ${this.score}\n` + RESET;
    
    return output;
  }

  drawWelcome(): string {
    const CYAN = '\x1b[36m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
    const RED = '\x1b[31m', MAGENTA = '\x1b[35m';
    
    return '\x1b[2J\x1b[10;1H' + CYAN + '🧱 BRICK BREAKER 🧱\n\n' + RESET + 
           YELLOW + 'Break all the bricks!\n\n' + RESET +
           RED + '█' + RESET + ' Strong (40pts) → ' +
           MAGENTA + '█' + RESET + ' (30pts) → ' +
           YELLOW + '█' + RESET + ' (20pts) → ' +
           CYAN + '█' + RESET + ' Weak (10pts)\n\n' +
           GREEN + 'Press P to start!\n' + 
           YELLOW + 'Press Q or Ctrl+C to exit back to Claude\n' + RESET;
  }
}

