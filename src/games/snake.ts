export class SnakeGame {
  private snake: Array<{ x: number; y: number }> = [{ x: 10, y: 10 }];
  private food = { x: 15, y: 15 };
  private direction = { x: 1, y: 0 };
  private score = 0;
  private playing = false;
  private gameOver = false;
  
  private readonly WIDTH = 40;
  private readonly HEIGHT = 20;

  isPlaying(): boolean {
    return this.playing;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  getScore(): number {
    return this.score;
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

  reset() {
    this.snake = [{ x: Math.floor(this.WIDTH / 2), y: Math.floor(this.HEIGHT / 2) }];
    this.direction = { x: 1, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.generateFood();
  }

  start() {
    this.playing = true;
    this.reset();
  }

  stop() {
    this.playing = false;
  }

  update() {
    if (this.gameOver) return;

    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Wall collision
    if (head.x < 0 || head.x >= this.WIDTH || head.y < 0 || head.y >= this.HEIGHT) {
      this.gameOver = true;
      this.playing = false;
      return;
    }

    // Self collision
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.gameOver = true;
      this.playing = false;
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
  }

  setDirection(dx: number, dy: number) {
    // Prevent reversing
    if (this.direction.x === -dx && this.direction.y === -dy) return;
    this.direction = { x: dx, y: dy };
  }

  draw(): string {
    const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', RESET = '\x1b[0m';
    const WHITE = '\x1b[37m';
    
    let output = '\x1b[2J\x1b[1;1H' + YELLOW + `Score: ${this.score} | Length: ${this.snake.length}` + RESET;

    // Top border
    output += `\x1b[2;1H` + WHITE + '┌' + '─'.repeat(this.WIDTH) + '┐' + RESET;

    for (let y = 0; y < this.HEIGHT; y++) {
      output += `\x1b[${y + 3};1H` + WHITE + '│' + RESET;
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
      output += WHITE + '│' + RESET;
    }

    // Bottom border
    output += `\x1b[${this.HEIGHT + 3};1H` + WHITE + '└' + '─'.repeat(this.WIDTH) + '┘' + RESET;

    output += `\x1b[${this.HEIGHT + 5};1H` + GREEN + 'Q/Ctrl+C: Exit | WASD/Arrows: Move | P: Restart' + RESET;
    return output;
  }

  drawGameOver(): string {
    const RED = '\x1b[31m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
    
    let output = '\x1b[2J\x1b[10;1H';
    output += RED + '🐍 GAME OVER! 🐍\n\n' + RESET;
    output += YELLOW + `Final Score: ${this.score}\n` + RESET;
    output += YELLOW + `Snake Length: ${this.snake.length}\n` + RESET;
    
    return output;
  }

  drawWelcome(): string {
    const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
    return '\x1b[2J\x1b[10;1H' + GREEN + '🐍 SNAKE GAME 🐍\n\n' + RESET + 
           YELLOW + 'Press P to start!\n' + 
           YELLOW + 'Press Q or Ctrl+C to exit back to Claude\n' + RESET;
  }
}

