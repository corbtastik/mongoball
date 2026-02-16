# MLB Season Data Downloader

Download complete MLB season data from [Retrosheet](https://www.retrosheet.org) and [Baseball Savant](https://baseballsavant.mlb.com) (Statcast).

## Quick Start

```bash
# Install dependencies
npm install

# Download everything for a season
npm run download -- 2023

# Download multiple seasons
npm run download -- 2020 2021 2022 2023

# Download only Retrosheet (skip Statcast)
npm run download -- 2019 --no-statcast

# Download only Statcast (2015+ only)
npm run download -- 2024 --statcast-only

# Include reference data (biographical, ejections)
npm run download -- 2023 --include-reference

# Download to a specific directory
npm run download -- 2023 -o /path/to/data
```

### Requirements

- Node.js 18+
- npm

## Data Availability

| Source | Years | Notes |
|--------|-------|-------|
| Retrosheet | 1871-present | Older years may have fewer file types |
| Statcast | 2015-present | Pitch tracking began in 2015 |
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
output-dir/
├── chadwick_register.csv    # Player ID crosswalk (all years)
├── reference/               # Biographical data, ejections
│   ├── biofile0.csv
│   ├── ejections.csv
│   └── ...
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

# Show collection statistics
npm run migrate -- --stats-only
```

### Collections

| Collection | Description | Documents (per season) |
|------------|-------------|------------------------|
| `players` | Player biographical data | ~15,000 total |
| `playerSeasons` | Per-season stats | ~1,500 |
| `games` | Game summaries | ~2,500 |
| `pitches` | Statcast pitch-by-pitch | ~730,000 |
| `rosters` | Team rosters | ~30 |
| `teams` | Team information | ~30 total |
| `venues` | Ballpark data | ~250 total |
| `ejections` | Ejection records | varies |

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
```

### Indexes

Indexes are created automatically for common query patterns:

- Pitches by pitcher/batter and season
- Games by date and team
- Players by ID and name
- Pitcher vs batter matchups

## Data Sources

- **Retrosheet**: Game logs, play-by-play, box scores, rosters. [retrosheet.org](https://www.retrosheet.org)
- **Baseball Savant**: Statcast pitch tracking data. [baseballsavant.mlb.com](https://baseballsavant.mlb.com)
- **Chadwick Bureau**: Player ID register. [github.com/chadwickbureau](https://github.com/chadwickbureau/register)

All data is free for non-commercial use. The information used here was obtained free of charge from and is copyrighted by Retrosheet.
