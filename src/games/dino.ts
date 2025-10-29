export class DinoGame {
  private dino = { y: 0, vy: 0, ducking: false, duckTimer: 0 };
  // variant: for cactus -> 0=small,1=tall,2=double; for bird -> 0=low,1=high; width used for collision
  private obstacles: Array<{ x: number; type: 'cactus' | 'bird'; height: number; variant?: number; width?: number }> = [];
  private ground: string[] = [];
  private score = 0;
  private distance = 0;
  private playing = false;
  private gameOver = false;
  private speed = 1;
  
  private readonly WIDTH = 70;
  private readonly HEIGHT = 15;
  private readonly GROUND_Y = this.HEIGHT - 3;
  private readonly GRAVITY = 0.6; // Reduced gravity for slower fall = more hang time
  private readonly JUMP_STRENGTH = -5.0; // Adjusted for balanced jump height with lower gravity
  private readonly DINO_X = 8;
  private readonly DUCK_DURATION = 10; // 10 frames at 50ms = 0.5 seconds

  isPlaying(): boolean {
    return this.playing;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  getScore(): number {
    return this.score;
  }

  generateGround() {
    const groundChars = ['_', '-', '.', '_', '_'];
    this.ground = [];
    for (let i = 0; i < this.WIDTH * 2; i++) {
      this.ground.push(groundChars[Math.floor(Math.random() * groundChars.length)]);
    }
  }

  reset() {
    this.dino = { y: 0, vy: 0, ducking: false, duckTimer: 0 };
    this.obstacles = [];
    this.score = 0;
    this.distance = 0;
    this.gameOver = false;
    this.speed = 1.2; // Slightly faster for more challenge
    this.generateGround();
    
    // Add first obstacle
    this.spawnObstacle();
  }

  start() {
    this.playing = true;
    this.reset();
  }

  stop() {
    this.playing = false;
  }

  spawnObstacle() {
    const lastObstacle = this.obstacles[this.obstacles.length - 1];
    const minDistance = 35 + Math.random() * 15; // Slightly more consistent spacing
    
    if (!lastObstacle || lastObstacle.x < this.WIDTH - minDistance) {
      const type = Math.random() > 0.6 ? 'bird' : 'cactus';
      if (type === 'bird') {
        const variant = Math.random() > 0.5 ? 0 : 1; // 0=low,1=high
        const height = variant === 0 ? 4 : 7;
        this.obstacles.push({ x: this.WIDTH + 5, type, height, variant, width: 5 }); // Updated width for new bird sprite
      } else {
        const variant = Math.random() < 0.15 ? 2 : (Math.random() < 0.5 ? 0 : 1); // favor single cacti
        const width = variant === 2 ? 5 : 3;
        this.obstacles.push({ x: this.WIDTH + 5, type, height: 0, variant, width });
      }
    }
  }

  jump() {
    if (this.dino.y === 0) {
      this.dino.ducking = false; // Auto-release duck when jumping
      this.dino.vy = this.JUMP_STRENGTH;
    }
  }

  duck(enable: boolean) {
    if (this.dino.y === 0 && enable) {
      this.dino.ducking = true;
      this.dino.duckTimer = this.DUCK_DURATION;
    }
  }

  update() {
    if (this.gameOver) return;

    // Update distance and score
    this.distance += this.speed;
    this.score = Math.floor(this.distance / 2);
    
    // Increase speed over time
    this.speed = 1 + Math.floor(this.score / 100) * 0.2;

    // Update dino physics
    if (this.dino.y !== 0 || this.dino.vy !== 0) {
      this.dino.vy += this.GRAVITY;
      this.dino.y += this.dino.vy;
      
      // Clamp to ground
      if (this.dino.y >= 0) {
        this.dino.y = 0;
        this.dino.vy = 0;
      }
    }

    // Auto-release duck after timer expires
    if (this.dino.ducking) {
      this.dino.duckTimer--;
      if (this.dino.duckTimer <= 0) {
        this.dino.ducking = false;
      }
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].x -= this.speed;
      
      // Remove off-screen obstacles
      if (this.obstacles[i].x < -5) {
        this.obstacles.splice(i, 1);
      }
    }

    // Spawn new obstacles
    this.spawnObstacle();

    // Check collisions
    for (const obstacle of this.obstacles) {
      if (this.checkCollision(obstacle)) {
        this.gameOver = true;
        this.playing = false;
        return;
      }
    }
  }

  checkCollision(obstacle: { x: number; type: 'cactus' | 'bird'; height: number; variant?: number; width?: number }): boolean {
    const dinoHeight = this.dino.ducking ? 2 : 5;
    const dinoBottomY = this.GROUND_Y + Math.floor(this.dino.y);
    const dinoTopY = dinoBottomY - dinoHeight + 1;
    const dinoWidth = 6; // Updated to match new sprite width

    if (obstacle.type === 'cactus') {
      // Cactus is on the ground, height 4
      const cactusHeight = obstacle.variant === 1 ? 5 : 4; // tall variant higher
      const cactusBottomY = this.GROUND_Y;
      const cactusTopY = cactusBottomY - cactusHeight + 1;
      const cactusWidth = obstacle.width || 3;
      
      // More forgiving collision - only check the center part of dino
      if (obstacle.x < this.DINO_X + dinoWidth - 1 && 
          obstacle.x + cactusWidth > this.DINO_X + 1 &&
          dinoBottomY >= cactusTopY &&
          dinoTopY <= cactusBottomY) {
        return true;
      }
    } else if (obstacle.type === 'bird') {
      // Bird is in the air - collision changes based on ducking state
      const birdBottomY = this.GROUND_Y - obstacle.height;
      const birdTopY = birdBottomY - 1; // 2 pixels tall
      
      // When ducking, dino is only 2 pixels tall vs 5 when standing
      // This allows ducking under low birds but still hits high birds if not careful
      if (obstacle.x < this.DINO_X + dinoWidth - 1 && 
          obstacle.x + (obstacle.width || 3) > this.DINO_X + 1) {
        // Check if dino's hitbox overlaps with bird
        if (dinoBottomY >= birdTopY && dinoTopY <= birdBottomY) {
          return true;
        }
      }
    }

    return false;
  }

  draw(): string {
    const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', RESET = '\x1b[0m';
    const WHITE = '\x1b[37m', GRAY = '\x1b[90m', CYAN = '\x1b[36m';
    
    let output = '\x1b[2J\x1b[1;1H';
    
    // Score in top right
    const scoreText = `${this.score.toString().padStart(5, '0')}`;
    output += `\x1b[1;${this.WIDTH - 10}H` + GRAY + 'HI ' + WHITE + '00000' + RESET;
    output += `\x1b[2;${this.WIDTH - 10}H` + GRAY + scoreText.substring(0, 5) + RESET;

    // Draw game area
    // Position dino so its FEET are at ground level
    const dinoHeight = this.dino.ducking ? 2 : 5;
    const dinoBottomY = this.GROUND_Y + Math.floor(this.dino.y);
    const dinoTopY = dinoBottomY - dinoHeight + 1;
    const groundOffset = Math.floor(this.distance) % this.ground.length;

    for (let y = 0; y < this.HEIGHT; y++) {
      output += `\x1b[${y + 3};1H`;
      
      for (let x = 0; x < this.WIDTH; x++) {
        let char = ' ';
        let color = RESET;

        // Draw dino - improved graphics (now 6 wide)
        if (x >= this.DINO_X && x < this.DINO_X + 6 && y >= dinoTopY && y <= dinoBottomY) {
          const rowOffset = y - dinoTopY; // Which row of the dino sprite are we drawing?
          
          if (this.dino.ducking) {
            // Ducking dino (2 rows tall, 6 wide) - nicer crouched sprite
            if (rowOffset === 0) {
              if (x === this.DINO_X) char = ' ';
              else if (x === this.DINO_X + 1) char = '█';
              else if (x === this.DINO_X + 2) char = '█';
              else if (x === this.DINO_X + 3) char = '█';
              else if (x === this.DINO_X + 4) char = '█';
              else if (x === this.DINO_X + 5) char = '▄';
            } else if (rowOffset === 1) {
              if (x === this.DINO_X) char = '▄';
              else if (x === this.DINO_X + 1) char = '█';
              else if (x === this.DINO_X + 2) char = '▄';
              else if (x === this.DINO_X + 3) char = '▄';
              else if (x === this.DINO_X + 4) char = ' ';
              else if (x === this.DINO_X + 5) char = '▄';
            }
          } else {
            // Standing dino (5 rows tall, 6 wide) - nicer running sprite
            if (rowOffset === 0) {
              if (x === this.DINO_X + 3) char = '▄';
              else if (x === this.DINO_X + 4) char = '▄';
              else if (x === this.DINO_X + 5) char = '▄';
            } else if (rowOffset === 1) {
              if (x === this.DINO_X + 2) char = '▄';
              else if (x === this.DINO_X + 3) char = '█';
              else if (x === this.DINO_X + 4) char = '█';
              else if (x === this.DINO_X + 5) char = '█';
            } else if (rowOffset === 2) {
              if (x === this.DINO_X + 1) char = '▄';
              else if (x === this.DINO_X + 2) char = '█';
              else if (x === this.DINO_X + 3) char = '█';
              else if (x === this.DINO_X + 4) char = '█';
              else if (x === this.DINO_X + 5) char = '█';
            } else if (rowOffset === 3) {
              if (x === this.DINO_X) char = '▄';
              else if (x === this.DINO_X + 1) char = '█';
              else if (x === this.DINO_X + 2) char = '█';
              else if (x === this.DINO_X + 3) char = '█';
              else if (x === this.DINO_X + 4) char = ' ';
            } else if (rowOffset === 4) {
              if (x === this.DINO_X) char = '▀';
              else if (x === this.DINO_X + 1) char = ' ';
              else if (x === this.DINO_X + 2) char = '▀';
              else if (x === this.DINO_X + 3) char = ' ';
              else if (x === this.DINO_X + 4) char = '▀';
            }
          }
          if (char !== ' ') color = GREEN;
        }

        // Draw obstacles (nicer sprites)
        for (const obstacle of this.obstacles) {
          const obstacleX = Math.floor(obstacle.x);
          
          if (obstacle.type === 'cactus') {
            const baseY = this.GROUND_Y; // bottom row of cactus sits on ground
            const variant = obstacle.variant || 0; // 0=small,1=tall,2=double
            if (variant === 0) {
              // Small cactus (3 wide x 4 tall centered on obstacleX+1)
              if (y === baseY - 3 && x === obstacleX + 1) { char = '╥'; color = GREEN; }
              if (y === baseY - 2 && x === obstacleX + 1) { char = '║'; color = GREEN; }
              if (y === baseY - 1 && (x === obstacleX || x === obstacleX + 1 || x === obstacleX + 2)) { char = x === obstacleX + 1 ? '║' : '╫'; color = GREEN; }
              if (y === baseY && x === obstacleX + 1) { char = '║'; color = GREEN; }
            } else if (variant === 1) {
              // Tall cactus (3 wide x 5 tall)
              if (y === baseY - 4 && x === obstacleX + 1) { char = '╥'; color = GREEN; }
              if (y === baseY - 3 && x === obstacleX + 1) { char = '║'; color = GREEN; }
              if (y === baseY - 2 && (x === obstacleX || x === obstacleX + 1 || x === obstacleX + 2)) { char = x === obstacleX + 1 ? '║' : '╫'; color = GREEN; }
              if (y === baseY - 1 && x === obstacleX + 1) { char = '║'; color = GREEN; }
              if (y === baseY && x === obstacleX + 1) { char = '║'; color = GREEN; }
            } else {
              // Double cactus (two small cacti separated by 2 spaces) width ~5
              const left = obstacleX; const right = obstacleX + 3;
              // Left
              if (y === baseY - 3 && x === left + 1) { char = '╥'; color = GREEN; }
              if (y === baseY - 2 && x === left + 1) { char = '║'; color = GREEN; }
              if (y === baseY - 1 && (x === left || x === left + 1 || x === left + 2)) { char = x === left + 1 ? '║' : '╫'; color = GREEN; }
              if (y === baseY && x === left + 1) { char = '║'; color = GREEN; }
              // Right
              if (y === baseY - 3 && x === right + 1) { char = '╥'; color = GREEN; }
              if (y === baseY - 2 && x === right + 1) { char = '║'; color = GREEN; }
              if (y === baseY - 1 && (x === right || x === right + 1 || x === right + 2)) { char = x === right + 1 ? '║' : '╫'; color = GREEN; }
              if (y === baseY && x === right + 1) { char = '║'; color = GREEN; }
            }
          } else if (obstacle.type === 'bird') {
            // Nicer bird sprite (5x2) - pterodactyl style
            const birdY = this.GROUND_Y - obstacle.height;
            if (y === birdY && x >= obstacleX && x < obstacleX + 5) {
              if (x === obstacleX) char = ' ';
              else if (x === obstacleX + 1) char = '▄';
              else if (x === obstacleX + 2) char = '█';
              else if (x === obstacleX + 3) char = '▄';
              else if (x === obstacleX + 4) char = ' ';
              color = RED;
            } else if (y === birdY + 1 && x >= obstacleX && x < obstacleX + 5) {
              if (x === obstacleX) char = '▀';
              else if (x === obstacleX + 1) char = '▄';
              else if (x === obstacleX + 2) char = ' ';
              else if (x === obstacleX + 3) char = '▄';
              else if (x === obstacleX + 4) char = '▀';
              color = RED;
            }
          }
        }

        // Draw ground
        if (y === this.GROUND_Y + 1) {
          const groundIdx = (x + groundOffset) % this.ground.length;
          char = this.ground[groundIdx];
          color = GRAY;
        }

        output += color + char + RESET;
      }
    }

    output += `\x1b[${this.HEIGHT + 5};1H` + CYAN + 
              '↑/SPACE: Jump | ↓: Duck | P: Restart | Q/Ctrl+C: Exit' + RESET;
    return output;
  }

  drawGameOver(): string {
    const RED = '\x1b[31m', YELLOW = '\x1b[33m', RESET = '\x1b[0m', GRAY = '\x1b[90m';
    
    let output = '\x1b[2J\x1b[10;1H';
    output += RED + '🦖 G A M E  O V E R! 🦖\n\n' + RESET;
    output += GRAY + 'Your Score: ' + RESET + YELLOW + this.score.toString().padStart(5, '0') + '\n' + RESET;
    
    return output;
  }

  drawWelcome(): string {
    const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m', CYAN = '\x1b[36m';
    const GRAY = '\x1b[90m';
    
    return '\x1b[2J\x1b[8;1H' + 
           GREEN + '🦖 CHROME DINO GAME 🦖\n\n' + RESET + 
           GRAY + 'Jump over cacti and duck under birds!\n\n' + RESET +
           YELLOW + 'Press ↑ or SPACE to jump\n' + RESET +
           YELLOW + 'Press ↓ to duck\n\n' + RESET +
           CYAN + 'Press P to start!\n' + RESET +
           CYAN + 'Press Q or Ctrl+C to exit back to Claude\n' + RESET;
  }
}

