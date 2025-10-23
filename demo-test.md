# Testing Alternate Screen

Follow these steps to see the alternate screen in action:

## Step 1: Create some content in your main terminal

```bash
# Type these commands first:
echo "======================================"
echo "This is my MAIN TERMINAL content"
echo "======================================"
ls -la
pwd
echo ""
echo "Counter starting..."
```

## Step 2: Start a background counter

```bash
# Run this - it will print every second in the MAIN terminal
npm run counter
```

You should see:
```
⏱  Counter: 0 | Time: 10:30:45
⏱  Counter: 1 | Time: 10:30:46
```

## Step 3: Let it run for a few seconds

Wait and watch the counter increment to like 5 or 10.

## Step 4: WITHOUT stopping the counter, open a NEW terminal and run the game

In a completely new terminal tab/window:
```bash
cd terminal-pong-ts
npm run dev
```

## Step 5: Exit the game (press Q)

## Step 6: Go back to the first terminal

You should see the counter STILL RUNNING and all your original content still there!

---

## Alternative: Single Terminal Test

If you want to test in a single terminal:

```bash
# 1. Create content first
echo "Original content - line 1"
echo "Original content - line 2"
date
ls

# 2. Now run the game
npm run dev

# 3. Press Q to exit

# 4. Your original content should still be there!
# You can scroll up and see everything
```

