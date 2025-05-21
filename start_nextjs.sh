#!/bin/bash

# Check for the .env file and create it from env.txt if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from env.txt..."
  cp env.txt .env
fi

# Start the Next.js dev server
echo "Starting Next.js development server..."
npm run dev

# Define cleanup function
cleanup() {
  echo "Shutting down server..."
  exit 0
}

# Set up trap for script termination
trap cleanup SIGINT SIGTERM

# Wait for server
wait 