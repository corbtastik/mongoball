#!/bin/bash
# recreate-data.sh - Download MLB season data from scratch
#
# Usage:
#   ./scripts/recreate-data.sh              # Download 2023 (default)
#   ./scripts/recreate-data.sh 2022         # Download specific year
#   ./scripts/recreate-data.sh 2022 2023    # Download multiple years
#   ./scripts/recreate-data.sh 2023 --no-statcast  # Skip Statcast

set -e

# Parse arguments
YEARS=()
SKIP_STATCAST=false
OUTPUT_DIR="./data"

for arg in "$@"; do
  case $arg in
    --no-statcast)
      SKIP_STATCAST=true
      ;;
    --output-dir=*)
      OUTPUT_DIR="${arg#*=}"
      ;;
    -o)
      shift
      OUTPUT_DIR="$1"
      ;;
    [0-9][0-9][0-9][0-9])
      YEARS+=("$arg")
      ;;
  esac
done

# Default to 2023 if no year specified
if [ ${#YEARS[@]} -eq 0 ]; then
  YEARS=(2023)
fi

# Create base directory structure
mkdir -p "$OUTPUT_DIR/reference"
mkdir -p "$OUTPUT_DIR/seasons"

echo "=========================================="
echo "  Recreating MLB Data"
echo "  Years: ${YEARS[*]}"
echo "  Output: $OUTPUT_DIR"
echo "=========================================="
echo ""

# Function to download and extract zip
download_zip() {
  local url="$1"
  local desc="$2"
  local dest_dir="$3"
  local filename=$(basename "$url")

  echo "  Downloading $desc..."
  if curl -sf -o "$dest_dir/$filename" "$url"; then
    unzip -oq "$dest_dir/$filename" -d "$dest_dir"
    rm "$dest_dir/$filename"
    return 0
  else
    echo "    Warning: $desc not available"
    return 1
  fi
}

# Reference Data (only need once)
echo "[Reference] Downloading reference data to $OUTPUT_DIR/reference/..."
download_zip "https://www.retrosheet.org/downloads/biodata.zip" "biographical data" "$OUTPUT_DIR/reference" || true
download_zip "https://www.retrosheet.org/ejections.zip" "ejections" "$OUTPUT_DIR/reference" || true

# Chadwick Bureau Crosswalk (only need once)
echo ""
echo "[Crosswalk] Downloading player ID crosswalk..."
echo "  Downloading 16 parts..."
rm -f "$OUTPUT_DIR/reference/chadwick_register.csv"
for i in 0 1 2 3 4 5 6 7 8 9 a b c d e f; do
  curl -sL "https://raw.githubusercontent.com/chadwickbureau/register/master/data/people-${i}.csv" >> "$OUTPUT_DIR/reference/chadwick_register.csv"
  echo -n "."
done
echo " done"

# Process each year
for YEAR in "${YEARS[@]}"; do
  echo ""
  echo "=========================================="
  echo "  Processing $YEAR season"
  echo "=========================================="

  # Create year directory structure
  YEAR_DIR="$OUTPUT_DIR/seasons/$YEAR"
  RETRO_DIR="$YEAR_DIR/retrosheet"
  STATCAST_DIR="$YEAR_DIR/statcast"
  mkdir -p "$RETRO_DIR"
  mkdir -p "$STATCAST_DIR"

  # Retrosheet Game Logs
  echo "[1/6] Game Logs"
  download_zip "https://www.retrosheet.org/gamelogs/gl${YEAR}.zip" "game logs" "$RETRO_DIR" || true

  # Retrosheet Events (Play-by-Play)
  echo "[2/6] Event Files"
  download_zip "https://www.retrosheet.org/events/${YEAR}eve.zip" "event files" "$RETRO_DIR" || true

  # Retrosheet Box Scores
  echo "[3/6] Box Score Events"
  download_zip "https://www.retrosheet.org/events/${YEAR}box.zip" "box scores" "$RETRO_DIR" || true

  # Retrosheet Postseason
  echo "[4/6] Postseason Events"
  download_zip "https://www.retrosheet.org/events/${YEAR}post.zip" "postseason" "$RETRO_DIR" || true

  # Retrosheet All-Star
  echo "[5/6] All-Star Game"
  download_zip "https://www.retrosheet.org/events/${YEAR}as.zip" "All-Star game" "$RETRO_DIR" || true

  # Retrosheet Schedule
  echo "[6/6] Schedule"
  download_zip "https://www.retrosheet.org/schedule/${YEAR}SKED.zip" "schedule" "$RETRO_DIR" || true

  # Statcast (2015+ only)
  if [[ "$SKIP_STATCAST" == "false" ]]; then
    if [[ $YEAR -ge 2015 ]]; then
      echo ""
      echo "[Statcast] Downloading pitch-by-pitch data for $YEAR..."
      echo "  This may take several minutes..."

      SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
      PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

      if command -v npx &> /dev/null && [[ -f "$PROJECT_DIR/package.json" ]]; then
        cd "$PROJECT_DIR"
        npm install --silent 2>/dev/null || true
        # Increase Node.js heap size for large Statcast downloads
        NODE_OPTIONS="--max-old-space-size=8192" npm run download -- "$YEAR" --statcast-only -o "$OUTPUT_DIR" || echo "  Warning: Statcast download failed"
      else
        echo "  WARNING: Node.js/npm not available or package.json missing"
        echo "  To download Statcast data manually:"
        echo "    npm install"
        echo "    NODE_OPTIONS='--max-old-space-size=8192' npm run download -- $YEAR --statcast-only -o $OUTPUT_DIR"
      fi
    else
      echo ""
      echo "[Statcast] Skipped (only available 2015+)"
    fi
  else
    echo ""
    echo "[Statcast] Skipped (--no-statcast flag)"
  fi
done

echo ""
echo "=========================================="
echo "  Download Complete!"
echo "  Years downloaded: ${YEARS[*]}"
echo "=========================================="
echo ""
echo "Directory structure:"
echo "  $OUTPUT_DIR/"
echo "  ├── reference/              # Shared reference data"
echo "  │   ├── chadwick_register.csv"
echo "  │   ├── biofile0.csv"
echo "  │   └── ejections.csv"
echo "  └── seasons/"
for YEAR in "${YEARS[@]}"; do
  echo "      └── $YEAR/"
  echo "          ├── retrosheet/"
  echo "          └── statcast/"
done
echo ""
echo "To verify: ./scripts/verify-data.sh ${YEARS[0]}"
