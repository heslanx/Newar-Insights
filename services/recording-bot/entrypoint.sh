#!/bin/bash
# Start Xvfb (X Virtual Frame Buffer) in background for headless:false browser
Xvfb :99 -screen 0 1920x1080x24 &

# Wait a bit for Xvfb to start
sleep 2

# Run the bot
node dist/index.js
