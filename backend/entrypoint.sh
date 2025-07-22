#!/bin/bash
set -e

echo "🚀 Starting Generator- Backend..."

# Wait for the database to be ready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h "${POSTGRES_HOST:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}"; do
  sleep 1
done

# Create the database if it doesn't exist
echo "🗄️ Ensuring database exists..."
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-postgres}" -tc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB:-ideas}';" | grep -q 1 || \
  PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" createdb -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-ideas}"

# Initialize database tables (this will create tables with the new columns)
echo "🗄️ Initializing database tables..."
python init_db.py

# Start FastAPI app
echo "🚀 Starting FastAPI app..."
uvicorn main:app --host 0.0.0.0 --port 8000 