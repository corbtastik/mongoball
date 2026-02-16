# Data Manifest

This document describes all source data files, their origins, and how to recreate them.

## Quick Recreate

```bash
# Install dependencies
npm install

# Download everything for 2023
npm run download -- 2023 --include-reference

# Or manually download each piece (see detailed steps below)
```

---

## Data Sources

| Source | URL | Data Type |
|--------|-----|-----------|
| Retrosheet | https://www.retrosheet.org | Game logs, play-by-play, box scores, rosters |
| Baseball Savant | https://baseballsavant.mlb.com | Statcast pitch tracking |
| Chadwick Bureau | https://github.com/chadwickbureau/register | Player ID crosswalk |

---

## File Inventory

### Statcast (Baseball Savant)

| File | Rows | Size | Source |
|------|-----:|-----:|--------|
| `2023_statcast.csv` | 732,563 | 394 MB | Baseball Savant Statcast Search API |

**How to recreate:**
```bash
npm run download -- 2023 --statcast-only
```

**Verification:**
- Row count: 732,563 (header + 732,562 pitches)
- Columns: 118
- Date range: 2023-03-30 to 2023-11-01

---

### Retrosheet Game Logs

| File | Rows | Size | Source URL |
|------|-----:|-----:|------------|
| `gl2023.txt` | 2,525 | 2.5 MB | https://www.retrosheet.org/gamelogs/gl2023.zip |

**How to recreate:**
```bash
curl -O https://www.retrosheet.org/gamelogs/gl2023.zip && unzip gl2023.zip
```

**Verification:**
- 2,525 games (regular season + postseason)
- 161 fields per line

---

### Retrosheet Event Files (Play-by-Play)

| Pattern | Count | Total Size | Source URL |
|---------|------:|------------|------------|
| `2023*.EVA` | 15 | ~6 MB | https://www.retrosheet.org/events/2023eve.zip |
| `2023*.EVN` | 15 | ~6 MB | https://www.retrosheet.org/events/2023eve.zip |

**How to recreate:**
```bash
curl -O https://www.retrosheet.org/events/2023eve.zip && unzip 2023eve.zip
```

**Verification:**
- 30 team files total (15 AL + 15 NL)
- Each file: ~13,000-14,000 lines

---

### Retrosheet Box Score Events

| File | Rows | Size | Source URL |
|------|-----:|-----:|------------|
| `2023.EBA` | 156,268 | 6.1 MB | https://www.retrosheet.org/events/2023box.zip |
| `2023.EBN` | 156,568 | 6.1 MB | https://www.retrosheet.org/events/2023box.zip |

**How to recreate:**
```bash
curl -O https://www.retrosheet.org/events/2023box.zip && unzip 2023box.zip
```

---

### Retrosheet Postseason & All-Star

| File | Size | Source URL |
|------|-----:|------------|
| `2023WS.EVE` | 26 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023ALCS.EVE` | 37 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023NLCS.EVE` | 35 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023ALD1.EVE` | 16 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023ALD2.EVE` | 20 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023NLD1.EVE` | 17 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023NLD2.EVE` | 21 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023ALW1.EVE` | 11 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023ALW2.EVE` | 9 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023NLW1.EVE` | 11 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023NLW2.EVE` | 9 KB | https://www.retrosheet.org/events/2023post.zip |
| `2023AS.EVE` | 7 KB | https://www.retrosheet.org/events/2023as.zip |

**How to recreate:**
```bash
curl -O https://www.retrosheet.org/events/2023post.zip && unzip 2023post.zip
curl -O https://www.retrosheet.org/events/2023as.zip && unzip 2023as.zip
```

---

### Retrosheet Daily CSV Statistics

| File | Rows | Size | Source URL |
|------|-----:|-----:|------------|
| `2023batting.csv` | 72,477 | 8.2 MB | https://www.retrosheet.org/downloads/2023/2023csvs.zip |
| `2023pitching.csv` | 21,063 | 2.5 MB | https://www.retrosheet.org/downloads/2023/2023csvs.zip |
| `2023fielding.csv` | 67,624 | 6.3 MB | https://www.retrosheet.org/downloads/2023/2023csvs.zip |
| `2023plays.csv` | 194,351 | 104 MB | https://www.retrosheet.org/downloads/2023/2023csvs.zip |
| `2023gameinfo.csv` | ~2,500 | 542 KB | https://www.retrosheet.org/downloads/2023/2023csvs.zip |
| `2023teamstats.csv` | ~5,000 | 1.8 MB | https://www.retrosheet.org/downloads/2023/2023csvs.zip |
| `2023allplayers.csv` | ~1,400 | 138 KB | https://www.retrosheet.org/downloads/2023/2023csvs.zip |

**How to recreate:**
```bash
curl -O https://www.retrosheet.org/downloads/2023/2023csvs.zip && unzip 2023csvs.zip
```

---

### Retrosheet Schedule

| File | Size | Source URL |
|------|-----:|------------|
| `2023schedule.csv` | 145 KB | https://www.retrosheet.org/schedule/2023SKED.zip |

**How to recreate:**
```bash
curl -O https://www.retrosheet.org/schedule/2023SKED.zip && unzip 2023SKED.zip
```

---

### Retrosheet Rosters

| Pattern | Count | Source |
|---------|------:|--------|
| `*2023.ROS` | 32 | Included in event zips |
| `TEAM2023` | 1 | Included in event zips |

**Verification:**
- 30 team rosters + 2 All-Star rosters
- TEAM2023: 32 lines (30 teams + 2 All-Star teams)

---

### Reference Data (All-Time)

| File | Rows | Size | Source URL |
|------|-----:|-----:|------------|
| `biofile0.csv` | 26,962 | 3.9 MB | https://www.retrosheet.org/downloads/biodata.zip |
| `ballparks0.csv` | ~250 | 26 KB | https://www.retrosheet.org/downloads/biodata.zip |
| `coaches0.csv` | ~8,000 | 508 KB | https://www.retrosheet.org/downloads/biodata.zip |
| `managers0.csv` | ~700 | 34 KB | https://www.retrosheet.org/downloads/biodata.zip |
| `umpires0.csv` | ~1,200 | 64 KB | https://www.retrosheet.org/downloads/biodata.zip |
| `teams0.csv` | ~150 | 7 KB | https://www.retrosheet.org/downloads/biodata.zip |
| `relatives.csv` | ~1,000 | 35 KB | https://www.retrosheet.org/downloads/biodata.zip |
| `ejections.csv` | 19,731 | 1.8 MB | https://www.retrosheet.org/ejections.zip |

**How to recreate:**
```bash
curl -O https://www.retrosheet.org/downloads/biodata.zip && unzip biodata.zip
curl -O https://www.retrosheet.org/ejections.zip && unzip ejections.zip
```

---

### Player ID Crosswalk (Chadwick Bureau)

| File | Rows | Size | Source |
|------|-----:|-----:|--------|
| `chadwick_register.csv` | 510,643 | 63 MB | GitHub Chadwick Bureau |

**How to recreate:**
```bash
for i in 0 1 2 3 4 5 6 7 8 9 a b c d e f; do
  curl -sL "https://raw.githubusercontent.com/chadwickbureau/register/master/data/people-${i}.csv"
done > chadwick_register.csv
```

**Key fields for linking:**
- `key_retro` = Retrosheet ID
- `key_mlbam` = Statcast/MLBAM ID
- `key_bbref` = Baseball Reference ID
- `key_fangraphs` = FanGraphs ID

---

## Complete Recreate Script

```bash
#!/bin/bash
# recreate-2023-data.sh

set -e
DEST_DIR="${1:-.}"
cd "$DEST_DIR"

echo "=== Downloading 2023 MLB Data ==="

# Retrosheet Game Logs
echo "Downloading game logs..."
curl -sO https://www.retrosheet.org/gamelogs/gl2023.zip && unzip -o gl2023.zip && rm gl2023.zip

# Retrosheet Events
echo "Downloading event files..."
curl -sO https://www.retrosheet.org/events/2023eve.zip && unzip -o 2023eve.zip && rm 2023eve.zip
curl -sO https://www.retrosheet.org/events/2023box.zip && unzip -o 2023box.zip && rm 2023box.zip
curl -sO https://www.retrosheet.org/events/2023post.zip && unzip -o 2023post.zip && rm 2023post.zip
curl -sO https://www.retrosheet.org/events/2023as.zip && unzip -o 2023as.zip && rm 2023as.zip

# Retrosheet CSVs
echo "Downloading CSV statistics..."
curl -sO https://www.retrosheet.org/downloads/2023/2023csvs.zip && unzip -o 2023csvs.zip && rm 2023csvs.zip

# Retrosheet Schedule
echo "Downloading schedule..."
curl -sO https://www.retrosheet.org/schedule/2023SKED.zip && unzip -o 2023SKED.zip && rm 2023SKED.zip

# Reference Data
echo "Downloading reference data..."
curl -sO https://www.retrosheet.org/downloads/biodata.zip && unzip -o biodata.zip && rm biodata.zip
curl -sO https://www.retrosheet.org/ejections.zip && unzip -o ejections.zip && rm ejections.zip

# Chadwick Crosswalk
echo "Downloading player ID crosswalk..."
for i in 0 1 2 3 4 5 6 7 8 9 a b c d e f; do
  curl -sL "https://raw.githubusercontent.com/chadwickbureau/register/master/data/people-${i}.csv"
done > chadwick_register.csv

# Statcast (requires Node.js)
echo "Downloading Statcast data (this takes several minutes)..."
if command -v npx &> /dev/null; then
  npm install 2>/dev/null
  npm run download -- 2023 --statcast-only
else
  echo "Node.js not found. Install Node.js and run: npm run download -- 2023 --statcast-only"
fi

echo "=== Download Complete ==="
```

---

## Verification Script

```bash
#!/bin/bash
# verify-data.sh

echo "=== Verifying 2023 MLB Data ==="

check_file() {
  local file="$1"
  local min_lines="$2"
  local desc="$3"

  if [[ -f "$file" ]]; then
    lines=$(wc -l < "$file" | tr -d ' ')
    if [[ $lines -ge $min_lines ]]; then
      echo "✓ $desc: $lines lines"
    else
      echo "✗ $desc: Only $lines lines (expected $min_lines+)"
    fi
  else
    echo "✗ $desc: FILE MISSING"
  fi
}

# Statcast
check_file "2023_statcast.csv" 700000 "Statcast pitches"

# Game logs
check_file "gl2023.txt" 2400 "Game logs"

# Event files
eva_count=$(ls -1 2023*.EVA 2>/dev/null | wc -l | tr -d ' ')
evn_count=$(ls -1 2023*.EVN 2>/dev/null | wc -l | tr -d ' ')
echo "✓ Event files: $eva_count AL + $evn_count NL"

# Box scores
check_file "2023.EBA" 150000 "AL box scores"
check_file "2023.EBN" 150000 "NL box scores"

# Daily stats
check_file "2023batting.csv" 70000 "Batting stats"
check_file "2023pitching.csv" 20000 "Pitching stats"
check_file "2023fielding.csv" 60000 "Fielding stats"
check_file "2023plays.csv" 190000 "Play-by-play"

# Reference
check_file "chadwick_register.csv" 500000 "Player crosswalk"
check_file "biofile0.csv" 25000 "Biographical data"
check_file "ejections.csv" 19000 "Ejections"

# Rosters
ros_count=$(ls -1 *2023.ROS 2>/dev/null | wc -l | tr -d ' ')
echo "✓ Roster files: $ros_count"

echo "=== Verification Complete ==="
```

---

## Data Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLAYER ID CROSSWALK                         │
│                   chadwick_register.csv                         │
│  key_retro ←→ key_mlbam ←→ key_bbref ←→ key_fangraphs          │
└─────────────────────────────────────────────────────────────────┘
        │                    │
        ▼                    ▼
┌───────────────────┐  ┌───────────────────┐
│    RETROSHEET     │  │    STATCAST       │
│  (key_retro ID)   │  │  (key_mlbam ID)   │
├───────────────────┤  ├───────────────────┤
│ gl2023.txt        │  │ 2023_statcast.csv │
│ 2023batting.csv   │  │  - pitch_type     │
│ 2023pitching.csv  │  │  - velocity       │
│ 2023fielding.csv  │  │  - spin_rate      │
│ 2023plays.csv     │  │  - exit_velo      │
│ 2023*.EVA/EVN     │  │  - launch_angle   │
│ 2023.EBA/EBN      │  │  - xBA, xwOBA     │
│ *2023.ROS         │  │  - hc_x, hc_y     │
└───────────────────┘  └───────────────────┘
        │
        ▼
┌───────────────────┐
│ REFERENCE DATA    │
├───────────────────┤
│ biofile0.csv      │
│ ballparks0.csv    │
│ ejections.csv     │
│ teams0.csv        │
└───────────────────┘
```
