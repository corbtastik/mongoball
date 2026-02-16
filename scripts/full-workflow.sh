#!/bin/bash
# full-workflow.sh - Complete end-to-end workflow: download, migrate, verify
#
# Usage:
#   ./scripts/full-workflow.sh 2023
#   ./scripts/full-workflow.sh 2023 --with-lahman
#   ./scripts/full-workflow.sh 2023 --uri "mongodb://user:pass@host:27017"
#
# Environment Variables:
#   MONGODB_URI     - MongoDB connection string (default: mongodb://localhost:27017)
#   MONGODB_DB      - Database name (default: mlb)
#   DATA_DIR        - Data directory (default: ./data)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Defaults
YEAR=""
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
MONGODB_DB="${MONGODB_DB:-mlb}"
DATA_DIR="${DATA_DIR:-./data}"
WITH_LAHMAN=false
FRESH=false
SKIP_DOWNLOAD=false
SKIP_MIGRATE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --with-lahman)
      WITH_LAHMAN=true
      shift
      ;;
    --uri)
      MONGODB_URI="$2"
      shift 2
      ;;
    --database)
      MONGODB_DB="$2"
      shift 2
      ;;
    --data-dir)
      DATA_DIR="$2"
      shift 2
      ;;
    --fresh)
      FRESH=true
      shift
      ;;
    --skip-download)
      SKIP_DOWNLOAD=true
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=true
      shift
      ;;
    [0-9][0-9][0-9][0-9])
      YEAR="$1"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$YEAR" ]]; then
  echo "Usage: $0 <year> [options]"
  echo ""
  echo "Options:"
  echo "  --with-lahman     Include Lahman database (awards, HOF, salaries)"
  echo "  --uri <uri>       MongoDB connection URI"
  echo "  --database <name> Database name (default: mlb)"
  echo "  --data-dir <dir>  Data directory (default: ./data)"
  echo "  --fresh           Drop existing data before migrating"
  echo "  --skip-download   Skip download step (use existing data)"
  echo "  --skip-migrate    Skip migrate step (only verify)"
  echo ""
  echo "Environment Variables:"
  echo "  MONGODB_URI       MongoDB connection string"
  echo "  MONGODB_DB        Database name"
  echo "  DATA_DIR          Data directory"
  exit 1
fi

# Header
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    MONGOBALL FULL WORKFLOW                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Season:      ${GREEN}$YEAR${NC}"
echo -e "  Database:    ${GREEN}$MONGODB_DB${NC}"
echo -e "  Data Dir:    ${GREEN}$DATA_DIR${NC}"
echo -e "  Lahman:      ${GREEN}$WITH_LAHMAN${NC}"
echo -e "  Fresh:       ${GREEN}$FRESH${NC}"
echo ""

# Step 1: Download
if [[ "$SKIP_DOWNLOAD" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}STEP 1: Download Data${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  DOWNLOAD_ARGS="$YEAR -o $DATA_DIR"
  if [[ "$WITH_LAHMAN" == "true" ]]; then
    DOWNLOAD_ARGS="$DOWNLOAD_ARGS --lahman"
  fi

  echo "Running: npm run download -- $DOWNLOAD_ARGS"
  echo ""

  # Increase Node.js heap for large Statcast downloads
  NODE_OPTIONS="--max-old-space-size=8192" npm run download -- $DOWNLOAD_ARGS

  echo ""
  echo -e "${GREEN}✓ Download complete${NC}"
  echo ""
else
  echo -e "${YELLOW}Skipping download (--skip-download)${NC}"
  echo ""
fi

# Step 2: Migrate
if [[ "$SKIP_MIGRATE" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}STEP 2: Migrate to MongoDB${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  MIGRATE_ARGS="--uri \"$MONGODB_URI\" --database $MONGODB_DB --data-dir $DATA_DIR --years $YEAR"
  if [[ "$FRESH" == "true" ]]; then
    MIGRATE_ARGS="$MIGRATE_ARGS --fresh"
  fi

  # Build collections list
  COLLECTIONS="players,teams,venues,games,rosters,pitches,ejections"
  if [[ "$WITH_LAHMAN" == "true" ]]; then
    COLLECTIONS="$COLLECTIONS,lahman"
  fi
  MIGRATE_ARGS="$MIGRATE_ARGS --collections $COLLECTIONS"

  echo "Running: npm run migrate -- $MIGRATE_ARGS"
  echo ""

  eval "npm run migrate -- $MIGRATE_ARGS"

  echo ""
  echo -e "${GREEN}✓ Migration complete${NC}"
  echo ""
else
  echo -e "${YELLOW}Skipping migration (--skip-migrate)${NC}"
  echo ""
fi

# Step 3: Verify
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Verify Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

VERIFY_ARGS="--uri \"$MONGODB_URI\" --database $MONGODB_DB --year $YEAR"

echo "Running: npm run verify -- $VERIFY_ARGS"
echo ""

eval "npm run verify -- $VERIFY_ARGS"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      WORKFLOW COMPLETE                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
