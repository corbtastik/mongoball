# Mongoball

Download complete MLB data from [Retrosheet](https://www.retrosheet.org), [Baseball Savant](https://baseballsavant.mlb.com) (Statcast), and the [Lahman Baseball Database](https://sabr.org/lahman-database/) into MongoDB.

## Quick Start

```bash
# Install dependencies
npm install

# Full workflow: download, migrate, and verify (recommended)
./scripts/full-workflow.sh 2023

# Full workflow with Lahman data
./scripts/full-workflow.sh 2023 --with-lahman

# Full workflow with custom MongoDB
./scripts/full-workflow.sh 2023 --uri "mongodb://user:pass@host:27017" --database mlb
```

### Individual Commands

```bash
# Download everything for a season
npm run download -- 2023

# Download multiple seasons
npm run download -- 2020 2021 2022 2023

# Download only Retrosheet (skip Statcast)
npm run download -- 2019 --no-statcast

# Download only Statcast (2015+ only)
npm run download -- 2024 --statcast-only

# Download Lahman database (awards, HOF, salaries, historical stats)
npm run download -- --lahman-only

# Download season + Lahman data
npm run download -- 2023 --lahman

# Migrate to MongoDB
npm run migrate -- --years 2023

# Verify data with test queries
npm run verify -- --year 2023
```

### Requirements

- Node.js 18+
- npm

## Data Availability

| Source | Years | Notes |
|--------|-------|-------|
| Retrosheet | 1871-present | Game logs, play-by-play, rosters |
| Statcast | 2015-present | Pitch-by-pitch tracking data |
| Lahman | 1871-present | Season stats, awards, HOF, salaries |
| Chadwick Crosswalk | All years | Links Retrosheet IDs to MLBAM/Statcast IDs |

## Shell Scripts

```bash
# Download data (defaults to 2023)
./scripts/recreate-data.sh

# Download specific year(s)
./scripts/recreate-data.sh 2022
./scripts/recreate-data.sh 2020 2021 2022

# Skip Statcast
./scripts/recreate-data.sh 2019 --no-statcast

# Verify downloaded data
./scripts/verify-data.sh 2023
```

## Output Structure

```
data/
├── reference/                   # Shared reference data (all years)
│   ├── chadwick_register.csv    # Player ID crosswalk
│   ├── biofile0.csv             # Biographical data
│   ├── ballparks0.csv           # Ballpark data
│   ├── ejections.csv            # Ejection records
│   └── lahman/                  # Lahman Baseball Database
│       ├── People.csv           # Player biographical data
│       ├── HallOfFame.csv       # HOF voting records
│       ├── AwardsPlayers.csv    # Player awards
│       ├── Salaries.csv         # Player salaries
│       ├── Batting.csv          # Season batting stats
│       ├── Pitching.csv         # Season pitching stats
│       └── ...                  # 20+ more files
└── seasons/                     # Per-season data
    ├── 2023/
    │   ├── retrosheet/          # Retrosheet files
    │   │   ├── gl2023.txt       # Game logs
    │   │   ├── 2023*.EVA/EVN    # Event files
    │   │   ├── 2023.EBA/EBN     # Box scores
    │   │   └── *2023.ROS        # Rosters
    │   └── statcast/
    │       └── 2023_statcast.csv
    └── 2024/
        └── ...
```

## File Formats

### Game Logs (`gl{YEAR}.txt`)

One row per game with scores, team stats, umpires, managers, starters, and linescores. 161 fields per game.

### Play-by-Play Event Files

| Pattern | Description |
|---------|-------------|
| `{YEAR}XXX.EVA` | AL home games. Every pitch and play for games hosted by AL teams. |
| `{YEAR}XXX.EVN` | NL home games. Every pitch and play for games hosted by NL teams. |

Event files use Retrosheet's event notation. Each game starts with `id,TEAMYYYYMMDD#` followed by `info` records (metadata), `start` records (lineups), and `play` records (play-by-play).

### Box Score Event Files

| File | Description |
|------|-------------|
| `{YEAR}.EBA` | AL box score events - game metadata and player stats. |
| `{YEAR}.EBN` | NL box score events. |

### Postseason Event Files

| File | Description |
|------|-------------|
| `{YEAR}WS.EVE` | World Series |
| `{YEAR}ALCS.EVE` / `{YEAR}NLCS.EVE` | League Championship Series |
| `{YEAR}ALD1.EVE` / `{YEAR}ALD2.EVE` | AL Division Series |
| `{YEAR}NLD1.EVE` / `{YEAR}NLD2.EVE` | NL Division Series |
| `{YEAR}ALW1.EVE` / `{YEAR}ALW2.EVE` | AL Wild Card Series |
| `{YEAR}NLW1.EVE` / `{YEAR}NLW2.EVE` | NL Wild Card Series |
| `{YEAR}AS.EVE` | All-Star Game |

### Roster Files

| Pattern | Format |
|---------|--------|
| `XXX{YEAR}.ROS` | `playerid,last,first,bats,throws,team,pos` |
| `TEAM{YEAR}` | Team codes: `code,league,city,name` |

### Statcast Data (`{YEAR}_statcast.csv`)

Pitch-by-pitch tracking data with 118 columns per pitch. A full season contains ~730,000 pitches (~450 MB).

| Field | Description |
|-------|-------------|
| `pitch_type` | Pitch classification (FF=4-seam, SL=slider, CH=changeup, CU=curve, SI=sinker) |
| `release_speed` | Pitch velocity (mph) |
| `spin_rate` | Spin rate (rpm) |
| `pfx_x`, `pfx_z` | Pitch movement (inches) |
| `plate_x`, `plate_z` | Pitch location at plate |
| `launch_speed` | Exit velocity on contact (mph) |
| `launch_angle` | Launch angle on contact (degrees) |
| `hc_x`, `hc_y` | Hit coordinates for spray charts |
| `batter`, `pitcher` | MLBAM player IDs |
| `description` | Pitch outcome (ball, strike, foul, hit, etc.) |

**Note**: Bat tracking (bat speed, swing length) available 2024+ only.

### Player ID Crosswalk (`chadwick_register.csv`)

Maps player IDs across all major baseball data systems (~510K players).

| Field | System |
|-------|--------|
| `key_retro` | Retrosheet ID (e.g., `stris002`) |
| `key_mlbam` | MLB/Statcast ID (e.g., `675911`) |
| `key_bbref` | Baseball Reference ID |
| `key_fangraphs` | FanGraphs ID |

### Reference Data

| File | Description |
|------|-------------|
| `biofile0.csv` | All players/managers/umpires: ID, name, birth/death, debut dates |
| `ballparks0.csv` | Park codes with name, city, state, and date range |
| `teams0.csv` | Historical franchise codes |
| `managers0.csv` | Manager career records |
| `coaches0.csv` | Coaching assignments |
| `umpires0.csv` | Umpire career records |
| `ejections.csv` | All ejections: game ID, date, ejectee, umpire, reason |

## Key Relationships

```
Player ID (e.g., "stris002")
    ├── biofile0.csv           → biographical info
    ├── XXX{YEAR}.ROS          → team roster
    ├── {YEAR}batting.csv      → daily batting stats
    ├── {YEAR}pitching.csv     → daily pitching stats
    └── {YEAR}fielding.csv     → daily fielding stats

Game ID (e.g., "TEX202311010")
    ├── gl{YEAR}.txt           → game summary
    ├── {YEAR}XXX.EVA/EVN      → play-by-play
    ├── {YEAR}.EBA/EBN         → box score events
    └── {YEAR}gameinfo.csv     → game metadata

Retrosheet ↔ Statcast Link
    └── chadwick_register.csv  → key_retro ↔ key_mlbam
```

## Linking Retrosheet to Statcast

Use the Chadwick crosswalk to link Retrosheet player IDs to Statcast data:

```typescript
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Load crosswalk
const xwalk = parse(readFileSync('chadwick_register.csv'), { columns: true });

// Get MLBAM ID for a Retrosheet player
const player = xwalk.find(p => p.key_retro === 'stris002');
const mlbamId = player?.key_mlbam; // "675911"

// Now use mlbamId to query Statcast data
```

## Position Codes

Used in roster and fielding files:

| Code | Position |
|------|----------|
| 1 | Pitcher |
| 2 | Catcher |
| 3 | First Base |
| 4 | Second Base |
| 5 | Third Base |
| 6 | Shortstop |
| 7 | Left Field |
| 8 | Center Field |
| 9 | Right Field |
| 10 | Designated Hitter |

## MongoDB Migration

Load all data into MongoDB for querying and analysis.

### Quick Start

```bash
# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:7

# Install dependencies
npm install

# Migrate a single season
npm run migrate -- --data-dir ./data --years 2023

# Migrate multiple seasons
npm run migrate -- --data-dir ./data --years 2020-2024

# Fresh migration (drop existing data)
npm run migrate -- --data-dir ./data --years 2023 --fresh

# Only load specific collections
npm run migrate -- --years 2023 --collections pitches,games

# Load Lahman data (awards, HOF, salaries)
npm run migrate -- --collections lahman

# Show collection statistics
npm run migrate -- --stats-only
```

### Collections

**Retrosheet/Statcast:**

| Collection | Description | Documents |
|------------|-------------|-----------|
| `players` | Player biographical data | ~15,000 total |
| `playerSeasons` | Per-season stats | ~1,500/season |
| `games` | Game summaries | ~2,500/season |
| `pitches` | Statcast pitch-by-pitch | ~730,000/season |
| `rosters` | Team rosters | ~30/season |
| `teams` | Team information | ~30 total |
| `venues` | Ballpark data | ~250 total |
| `ejections` | Ejection records | varies |

**Lahman (use `--collections lahman`):**

| Collection | Description | Documents |
|------------|-------------|-----------|
| `hallOfFame` | HOF voting and inductions | ~6,400 |
| `awards` | MVP, Cy Young, ROY, etc. | ~13,000 |
| `awardShares` | Award voting details | ~8,200 |
| `salaries` | Player salaries (1985-2016) | ~26,400 |
| `schools` | College/university reference | ~1,300 |
| `collegePlaying` | Player college attendance | ~17,700 |
| `allStarAppearances` | All-Star game selections | ~6,400 |
| `managers` | Managerial records | ~4,400 |

### Schema Design

Data is normalized with consistent camelCase naming:

```javascript
// Example: Query a pitcher's fastballs
db.pitches.find({
  "pitcher.playerId": 675911,
  "pitch.type": "FF",
  season: 2023
})

// Example: Get a player's season stats
db.playerSeasons.findOne({
  playerId: "stris002",
  season: 2023
})

// Example: Batter vs Pitcher matchup
db.pitches.find({
  "pitcher.playerId": 675911,
  "batter.playerId": 656941,
  season: 2023
})

// Example: Hall of Fame inductees
db.hallOfFame.find({
  inducted: true,
  category: "Player"
})

// Example: MVP award winners
db.awards.find({
  awardId: "MVP",
  yearId: { $gte: 2020 }
})

// Example: Highest paid players in 2016
db.salaries.find({ yearId: 2016 }).sort({ salary: -1 }).limit(10)
```

### Indexes

Indexes are created automatically for common query patterns:

- Pitches by pitcher/batter and season
- Games by date and team
- Players by ID and name
- Pitcher vs batter matchups

## Full Workflow Test

This section walks through the complete end-to-end workflow: download, migrate to MongoDB, and verify with test queries.

### Prerequisites

1. **Node.js 18+** and **npm** installed
2. **MongoDB** running (local or remote)

```bash
# Option A: Start MongoDB with Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# Option B: Use an existing MongoDB instance
export MONGODB_URI="mongodb://user:pass@host:27017"
```

### Step 1: Install Dependencies

```bash
cd /path/to/mongoball
npm install
```

### Step 2: Download Data

Download season data (Retrosheet + Statcast) and optionally Lahman:

```bash
# Download 2023 season data (~450 MB for Statcast)
# This may take 5-10 minutes depending on connection speed
NODE_OPTIONS="--max-old-space-size=8192" npm run download -- 2023

# Or include Lahman database (awards, HOF, salaries)
NODE_OPTIONS="--max-old-space-size=8192" npm run download -- 2023 --lahman
```

Verify files were downloaded:

```bash
./scripts/verify-data.sh 2023
```

Expected output:
```
=== Verifying 2023 MLB Data ===
✓ Statcast pitches         732,562 lines
✓ Game logs                  2,430 lines
✓ Event files             15 AL + 15 NL files
✓ Roster files                  30 files
✓ Player ID crosswalk      510,000 lines
```

### Step 3: Migrate to MongoDB

Load data into MongoDB:

```bash
# Basic migration (uses localhost:27017, database: mlb)
npm run migrate -- --years 2023

# With custom MongoDB connection
npm run migrate -- --uri "mongodb://user:pass@host:27017" --database mlb --years 2023

# Fresh migration (drops existing collections first)
npm run migrate -- --years 2023 --fresh

# Include Lahman data
npm run migrate -- --years 2023 --collections players,teams,venues,games,rosters,pitches,ejections,lahman
```

Expected output:
```
Connecting to MongoDB: mongodb://localhost:27017
Connected to database: mlb

Migrating data for years 2023-2023
Data directory: /path/to/mongoball/data

Loading players from Chadwick register...
  Loaded 15,234 players
Loading teams...
  Loaded 33 teams
Loading games (2023-2023)...
  Loaded 2,430 games for 2023
Loading Statcast pitches (2023-2023)...
  Loaded 732,562 pitches for 2023

Creating indexes...
  Created indexes: players
  Created indexes: games
  Created indexes: pitches
  ...

Final Statistics:
  players: 15,234 documents
  games: 2,430 documents
  pitches: 732,562 documents
  rosters: 30 documents
  teams: 33 documents

Migration completed in 45.2s
```

### Step 4: Verify with Test Queries

Run 10 automated test queries to validate the data:

```bash
# Basic verification
npm run verify -- --year 2023

# With custom MongoDB connection
npm run verify -- --uri "mongodb://user:pass@host:27017" --database mlb --year 2023
```

Expected output:
```
======================================================================
MongoDB Data Verification
======================================================================
Database: mlb
Year: 2023

Test Results:
----------------------------------------------------------------------
✓ Players collection
    15,234 players loaded
    Sample: {"playerId":"stris002","name":{"first":"Spencer","last":"Strider"}}

✓ Games for 2023
    2,430 games
    Sample: {"gameId":"TEX202303300","home":"TEX","away":"PHI"}

✓ Pitches (Statcast) for 2023
    732,562 pitches
    Sample: {"pitcher":"Spencer Strider","pitchType":"FF","speed":99.1}

✓ Rosters for 2023
    30 team rosters

✓ Teams collection
    33 teams

✓ Pitch type distribution query
    Top 5 pitch types found
    Sample: [{"type":"FF","count":198234},{"type":"SL","count":142567}...]

✓ Home run leaders query
    Found 5 HR leaders
    Sample: [{"_id":660271,"homeRuns":54},{"_id":592450,"homeRuns":52}...]

✓ Hall of Fame (Lahman)
    6,427 records, 341 inducted

✓ Awards (Lahman)
    12,901 awards, 156 MVPs

✓ Salaries (Lahman)
    26,428 records, max: $34,571,429
    Sample: {"player":"Clayton Kershaw","salary":34571429,"year":2016}

======================================================================
Summary: 10 passed, 0 failed out of 10 tests
======================================================================
```

### One-Command Workflow

Alternatively, run everything with a single command:

```bash
# Full workflow: download, migrate, verify
./scripts/full-workflow.sh 2023

# With Lahman data
./scripts/full-workflow.sh 2023 --with-lahman

# With custom MongoDB and fresh start
./scripts/full-workflow.sh 2023 --with-lahman --fresh --uri "mongodb://user:pass@host:27017"
```

### Test Queries Explained

| # | Test | What It Validates |
|---|------|-------------------|
| 1 | Players collection | Chadwick crosswalk loaded correctly |
| 2 | Games for year | Retrosheet game logs parsed |
| 3 | Pitches (Statcast) | Statcast CSV streamed and loaded |
| 4 | Rosters | Team roster files parsed |
| 5 | Teams | Static team data loaded |
| 6 | Pitch type distribution | Aggregation pipeline works |
| 7 | Home run leaders | Complex query with batted ball data |
| 8 | Hall of Fame | Lahman HOF data loaded |
| 9 | Awards | Lahman awards loaded with denormalization |
| 10 | Salaries | Lahman salary data with max query |

### Troubleshooting

**Statcast download fails or runs out of memory:**
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=8192" npm run download -- 2023
```

**MongoDB connection refused:**
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Or start it
docker run -d -p 27017:27017 --name mongodb mongo:7
```

**Verification shows 0 documents:**
```bash
# Check if migration completed
npm run migrate -- --stats-only

# Re-run migration with fresh flag
npm run migrate -- --years 2023 --fresh
```

## Data Sources

- **Retrosheet**: Game logs, play-by-play, box scores, rosters. [retrosheet.org](https://www.retrosheet.org)
- **Baseball Savant**: Statcast pitch tracking data. [baseballsavant.mlb.com](https://baseballsavant.mlb.com)
- **Lahman Database**: Historical stats, awards, Hall of Fame, salaries. [sabr.org/lahman-database](https://sabr.org/lahman-database/)
- **Chadwick Bureau**: Player ID register. [github.com/chadwickbureau](https://github.com/chadwickbureau/register)

All data is free for non-commercial use. The information used here was obtained free of charge from and is copyrighted by Retrosheet. The Lahman Database is licensed under Creative Commons Attribution-ShareAlike 3.0.
