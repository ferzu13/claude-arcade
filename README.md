# 🎮 Claude Arcade

Add classic arcade games to your Claude Code workflow! Press `Ctrl+G` anytime to toggle between coding and gaming.

## ⚡ Quick Start

### Installation

```bash
npm install -g claude-arcade
```

That's it! Now you can use `claude-arc` to launch Claude Code with built-in games.

### Configuration (Optional)

To enable the **leaderboard feature**, you need to set up your own Supabase project:

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project and set up a `leaderboard` table
3. Copy `.env.example` to `.env` in the project root
4. Add your Supabase credentials to `.env`:

```bash
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

**Note:** The leaderboard feature is optional. Games will work without Supabase credentials, but you won't be able to submit scores.

## 🎯 Usage

```bash
# Start Claude with Brick Breaker (default)
claude-arc

# Start Claude with Snake
claude-arc -snake

# See all options
claude-arc --help

# Pass arguments to Claude
claude-arc --model gpt
claude-arc -snake --model gpt
```

## 🕹️ Controls

- **`Ctrl+G`** - Toggle game overlay on/off
- **`Q` or `Ctrl+C`** - Exit game back to Claude
- **`P`** - Play again (after game over)

### Game-Specific Controls

**Brick Breaker:**
- `A` / `←` - Move paddle left
- `D` / `→` - Move paddle right

**Snake:**
- `W` / `↑` - Move up
- `A` / `←` - Move left
- `S` / `↓` - Move down
- `D` / `→` - Move right

## 🎲 Games

### Brick Breaker
Classic breakout game with 4 strength levels:
- 🔴 **Red** (4 hits) → 🟣 Magenta (3 hits) → 🟡 Yellow (2 hits) → 🔵 Cyan (1 hit)
- Each brick awards points based on strength
- Submit your high score to the global leaderboard!

### Snake
Classic snake game:
- Eat food to grow longer
- Avoid walls and yourself
- Compete for the highest score!

## 🏆 Leaderboard

After each game, you can submit your score to the global leaderboard! Just enter your name when prompted.

## 🛠️ Development

```bash
# Clone the repository
git clone <your-repo-url>
cd claude-arcade

# Install dependencies
npm install

# Set up environment variables (for leaderboard)
cp .env.example .env
# Edit .env with your Supabase credentials

# Build
npm run build

# Test locally (runs games standalone, without Claude wrapper)
npm run dev:claude   # Brick Breaker
npm run dev:snake    # Snake
```

### Environment Variables

The project uses the following environment variables (stored in `.env`):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key (safe for client-side use)

**Important:** Never commit your `.env` file to version control. It's already included in `.gitignore`.

## 📦 Uninstall

```bash
npm uninstall -g claude-arcade
```

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit PRs.

## 📄 License

MIT
