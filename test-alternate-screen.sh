#!/bin/bash

# Test script to demonstrate alternate screen
# This counter runs in the main terminal

echo "Main Terminal Counter Test"
echo "=========================="
echo ""
echo "This counter will keep running in the background."
echo "Press Enter to start the game..."
read

# Start counter in background
(
  counter=0
  while true; do
    echo "Counter: $counter ($(date +%H:%M:%S))"
    counter=$((counter + 1))
    sleep 1
  done
) &

COUNTER_PID=$!
echo "Counter started (PID: $COUNTER_PID)"
echo ""
echo "Now starting the game in alternate screen..."
sleep 2

# Run the game (alternate screen)
npm run dev

# When game exits, we're back here
echo ""
echo "Game exited! Counter was running the whole time:"
echo "Killing counter process..."
kill $COUNTER_PID 2>/dev/null

echo ""
echo "✅ Test complete! The main terminal was preserved."

