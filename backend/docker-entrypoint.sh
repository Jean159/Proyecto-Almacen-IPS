#!/bin/sh
set -e

echo "[DevOps] Checking database connection..."
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  echo "[DevOps] Waiting for PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT..."
  sleep 1
done

echo "[DevOps] PostgreSQL is ready!"

# Apply migrations
echo "[DevOps] Applying database migrations..."
python manage.py migrate --noinput

# Run seed data if flag is set
if [ "$SEED_ON_STARTUP" = "1" ]; then
  echo "[DevOps] Seeding SUNAT catalogue and demo data..."
  python manage.py seed_sunat || true
  python manage.py seed_demo || true
fi

echo "[DevOps] Starting backend application..."
exec "$@"
