# Terminal Breakout Game

A terminal-based Breakout game built with TypeScript and terminal-kit.

## Installation

```bash
npm install
```

## Play the Game

```bash
npm start
```

## Controls

- `A` / `←` - Move paddle left
- `D` / `→` - Move paddle right  
- `P` - Play again (after game over)
- `Q` or `Ctrl+C` - Quit

## How It Works

The game uses terminal-kit's alternate screen feature, so:
- Your terminal content is preserved
- Game runs in a separate screen
- When you quit, you return to exactly where you were

## Use with Claude Code (or any terminal app)

1. Run Claude Code (or any app) in your terminal
2. When you want to play, run: `npm start`
3. Game opens in alternate screen
4. Exit game with Ctrl+C
5. You're back in Claude/your app exactly where you left off!

The alternate screen means your work is never interrupted or lost.
