#!/bin/bash
set -e

# Set default DATABASE_URL if not set (for local runs)
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ideas"
  echo "[INFO] DATABASE_URL not set, using default: $DATABASE_URL"
else
  echo "[INFO] Using DATABASE_URL: $DATABASE_URL"
fi

# Set PYTHONPATH to backend for local runs, or /app for Docker
if [ -d "/app" ]; then
  export PYTHONPATH=/app
  SCRIPTS_PATH=/app/scripts
  RUNNER_PATH=/app/cron/nightly_runner.py
else
  export PYTHONPATH=backend
  SCRIPTS_PATH=backend/scripts
  RUNNER_PATH=backend/cron/nightly_runner.py
fi

# 1. Reset the database (drop and recreate all tables)
echo "[INFO] Resetting database..."
python3 $SCRIPTS_PATH/reset_db.py

# 2. Fetch trending repos and generate 10 business ideas per repo
echo "[INFO] Fetching trending repos and generating business ideas..."
python3 $RUNNER_PATH

# 3. (Optional) Start the backend server (uncomment if desired)
# echo "[INFO] Starting backend server..."
# python3 backend/start.py

echo "[INFO] Startup pipeline complete. You can now start the frontend!" 