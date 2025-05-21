#!/bin/bash

# Make sure scripts are executable
chmod +x src/scripts/start_pizza_server.sh

# Check for the .env file and create it from env.txt if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from env.txt..."
  cp env.txt .env
  echo "PYTHON_API_URL=http://localhost:8000" >> .env
fi

# Start the Python server in the background
echo "Starting Python FastAPI server..."
./src/scripts/start_pizza_server.sh &
PYTHON_PID=$!

# Sleep to allow the Python server to start
sleep 2

# Start the Next.js dev server
echo "Starting Next.js development server..."
npm run dev

# Define cleanup function
cleanup() {
  echo "Shutting down servers..."
  kill $PYTHON_PID
  exit 0
}

# Set up trap for script termination
trap cleanup SIGINT SIGTERM

# Wait for both servers
wait 