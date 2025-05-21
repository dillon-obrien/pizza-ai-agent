#!/bin/bash

# Activate the Python virtual environment
source venv/bin/activate

# Set environment variables from env.txt if .env doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from env.txt"
  cp env.txt .env
fi

# Export the environment variables
export $(grep -v '^#' .env | xargs)

# Make sure the current directory is in the Python path
export PYTHONPATH=$PYTHONPATH:$(pwd)/src/scripts

# Start the FastAPI server
cd src/scripts
echo "Starting Pizza Agent API server..."
python pizza_api_server.py 