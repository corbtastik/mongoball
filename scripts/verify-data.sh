#!/bin/bash
# verify-data.sh - Verify MLB data files are present and valid
#
# Usage:
#   ./scripts/verify-data.sh          # Verify 2023 (default)
#   ./scripts/verify-data.sh 2022     # Verify specific year

set -e

YEAR="${1:-2023}"
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "=== Verifying ${YEAR} MLB Data ==="
echo ""

ERRORS=0
WARNINGS=0

check_file() {
  local file="$1"
  local min_lines="$2"
  local desc="$3"

  if [[ -f "$file" ]]; then
    lines=$(wc -l < "$file" | tr -d ' ')
    if [[ $lines -ge $min_lines ]]; then
      printf "${GREEN}✓${NC} %-25s %'10d lines\n" "$desc" "$lines"
    else
      printf "${YELLOW}!${NC} %-25s %'10d lines (expected %'d+)\n" "$desc" "$lines" "$min_lines"
      ((WARNINGS++))
    fi
  else
    printf "${RED}✗${NC} %-25s MISSING\n" "$desc"
    ((ERRORS++))
  fi
}

check_file_optional() {
  local file="$1"
  local min_lines="$2"
  local desc="$3"

  if [[ -f "$file" ]]; then
    lines=$(wc -l < "$file" | tr -d ' ')
    printf "${GREEN}✓${NC} %-25s %'10d lines\n" "$desc" "$lines"
  else
    printf "${YELLOW}-${NC} %-25s not present\n" "$desc"
  fi
}

# Check if year directory exists
if [[ -d "$YEAR" ]]; then
  DATA_DIR="$YEAR"
elif [[ -d "${YEAR}/retrosheet" ]]; then
  DATA_DIR="$YEAR"
else
  DATA_DIR="."
fi

echo "Data directory: $(pwd)/$DATA_DIR"
echo ""

# Statcast (2015+ only)
if [[ $YEAR -ge 2015 ]]; then
  echo "--- Statcast (Baseball Savant) ---"
  STATCAST_FILE=""
  if [[ -f "${DATA_DIR}/statcast/${YEAR}_statcast.csv" ]]; then
    STATCAST_FILE="${DATA_DIR}/statcast/${YEAR}_statcast.csv"
  elif [[ -f "${DATA_DIR}/${YEAR}_statcast.csv" ]]; then
    STATCAST_FILE="${DATA_DIR}/${YEAR}_statcast.csv"
  elif [[ -f "${YEAR}_statcast.csv" ]]; then
    STATCAST_FILE="${YEAR}_statcast.csv"
  fi

  if [[ -n "$STATCAST_FILE" ]]; then
    check_file "$STATCAST_FILE" 700000 "Statcast pitches"
  else
    printf "${RED}✗${NC} %-25s MISSING\n" "Statcast pitches"
    ((ERRORS++))
  fi
  echo ""
fi

# Retrosheet data
RETRO_DIR="${DATA_DIR}/retrosheet"
if [[ ! -d "$RETRO_DIR" ]]; then
  RETRO_DIR="$DATA_DIR"
fi

echo "--- Retrosheet Game Logs ---"
check_file "${RETRO_DIR}/gl${YEAR}.txt" 2400 "Game logs"

echo ""
echo "--- Retrosheet Event Files ---"
eva_count=$(ls -1 "${RETRO_DIR}/${YEAR}"*.EVA 2>/dev/null | wc -l | tr -d ' ')
evn_count=$(ls -1 "${RETRO_DIR}/${YEAR}"*.EVN 2>/dev/null | wc -l | tr -d ' ')
if [[ $eva_count -ge 14 && $evn_count -ge 14 ]]; then
  printf "${GREEN}✓${NC} %-25s %d AL + %d NL files\n" "Event files" "$eva_count" "$evn_count"
elif [[ $eva_count -gt 0 || $evn_count -gt 0 ]]; then
  printf "${YELLOW}!${NC} %-25s %d AL + %d NL (expected 14-15 each)\n" "Event files" "$eva_count" "$evn_count"
  ((WARNINGS++))
else
  printf "${RED}✗${NC} %-25s MISSING\n" "Event files"
  ((ERRORS++))
fi

echo ""
echo "--- Retrosheet Box Scores ---"
check_file_optional "${RETRO_DIR}/${YEAR}.EBA" 150000 "AL box scores"
check_file_optional "${RETRO_DIR}/${YEAR}.EBN" 150000 "NL box scores"

echo ""
echo "--- Retrosheet Postseason ---"
post_count=$(ls -1 "${RETRO_DIR}/${YEAR}"*.EVE 2>/dev/null | wc -l | tr -d ' ')
if [[ $post_count -ge 10 ]]; then
  printf "${GREEN}✓${NC} %-25s %d files\n" "Postseason events" "$post_count"
elif [[ $post_count -gt 0 ]]; then
  printf "${YELLOW}!${NC} %-25s %d files (expected 10+)\n" "Postseason events" "$post_count"
  ((WARNINGS++))
else
  printf "${YELLOW}-${NC} %-25s not present\n" "Postseason events"
fi

echo ""
echo "--- Retrosheet Rosters ---"
ros_count=$(ls -1 "${RETRO_DIR}/"*${YEAR}.ROS 2>/dev/null | wc -l | tr -d ' ')
if [[ $ros_count -ge 30 ]]; then
  printf "${GREEN}✓${NC} %-25s %d files\n" "Roster files" "$ros_count"
elif [[ $ros_count -gt 0 ]]; then
  printf "${YELLOW}!${NC} %-25s %d files (expected 30)\n" "Roster files" "$ros_count"
  ((WARNINGS++))
else
  printf "${RED}✗${NC} %-25s MISSING\n" "Roster files"
  ((ERRORS++))
fi

if [[ -f "${RETRO_DIR}/TEAM${YEAR}" ]]; then
  printf "${GREEN}✓${NC} %-25s present\n" "Team codes"
else
  printf "${YELLOW}-${NC} %-25s not present\n" "Team codes"
fi

echo ""
echo "--- Reference Data (shared) ---"
check_file_optional "chadwick_register.csv" 500000 "Player ID crosswalk"
check_file_optional "reference/biofile0.csv" 25000 "Biographical data"
check_file_optional "reference/ejections.csv" 19000 "Ejections"

echo ""
echo "=== Verification Summary for ${YEAR} ==="
if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  printf "${GREEN}All checks passed!${NC}\n"
  exit 0
elif [[ $ERRORS -eq 0 ]]; then
  printf "${YELLOW}$WARNINGS warning(s), no critical errors${NC}\n"
  exit 0
else
  printf "${RED}$ERRORS critical error(s), $WARNINGS warning(s)${NC}\n"
  exit 1
fi
