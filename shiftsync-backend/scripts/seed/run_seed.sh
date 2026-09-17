#!/bin/bash
# ShiftSync Master Seed Dataset Runner (Bash)
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
SEED_FILE="$DIR/seed_master_dataset.sql"

if [ ! -f "$SEED_FILE" ]; then
    echo "Error: seed_master_dataset.sql not found at $SEED_FILE"
    exit 1
fi

echo "Applying seed_master_dataset.sql to shiftsync-db..."
cat "$SEED_FILE" | docker exec -i shiftsync-db psql -U postgres -d shiftsync

echo "=== DATABASE SEEDED SUCCESSFULLY! READY FOR MANUAL QA ==="
