/**
 * Player Seasons Loader
 *
 * Loads aggregated player season statistics from Lahman batting and pitching data.
 * This provides historical stats going back to 1871.
 *
 * Data sources:
 *   - Batting.csv: Season batting statistics
 *   - Pitching.csv: Season pitching statistics
 *   - People.csv: Player names for denormalization
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, PlayerSeason, BattingStats, PitchingStats } from '../schema.js';
import { streamCSV, rowToObject, parseInt, parseFloat, batch } from '../parsers.js';
import { LAHMAN } from '../../config/sources.js';

const BATCH_SIZE = 2000;

// Lookup for player names
let peopleLookup: Map<string, { nameFirst: string; nameLast: string }> = new Map();

interface BattingRow {
  playerID: string;
  yearID: string;
  stint: string;
  teamID: string;
  lgID: string;
  G: string;
  AB: string;
  R: string;
  H: string;
  '2B': string;
  '3B': string;
  HR: string;
  RBI: string;
  SB: string;
  CS: string;
  BB: string;
  SO: string;
  IBB: string;
  HBP: string;
  SH: string;
  SF: string;
  GIDP: string;
}

interface PitchingRow {
  playerID: string;
  yearID: string;
  stint: string;
  teamID: string;
  lgID: string;
  W: string;
  L: string;
  G: string;
  GS: string;
  CG: string;
  SHO: string;
  SV: string;
  IPouts: string;
  H: string;
  ER: string;
  HR: string;
  BB: string;
  SO: string;
  BAOpp: string;
  ERA: string;
  IBB: string;
  WP: string;
  HBP: string;
  BK: string;
  BFP: string;
  GF: string;
  R: string;
}

/**
 * Build lookup for player names
 */
async function buildPeopleLookup(lahmanDir: string): Promise<void> {
  const peoplePath = join(lahmanDir, LAHMAN.files.people);
  if (!existsSync(peoplePath)) return;

  for await (const { row, headers } of streamCSV(peoplePath)) {
    if (!headers) continue;
    const obj = rowToObject(row, headers);
    if (obj.playerID) {
      peopleLookup.set(obj.playerID, {
        nameFirst: obj.nameFirst || '',
        nameLast: obj.nameLast || '',
      });
    }
  }
}

/**
 * Calculate batting average
 */
function calculateAvg(hits: number, atBats: number): number | undefined {
  if (atBats === 0) return undefined;
  return Math.round((hits / atBats) * 1000) / 1000;
}

/**
 * Calculate on-base percentage
 */
function calculateObp(
  hits: number,
  walks: number,
  hbp: number,
  atBats: number,
  sf: number
): number | undefined {
  const denom = atBats + walks + hbp + sf;
  if (denom === 0) return undefined;
  return Math.round(((hits + walks + hbp) / denom) * 1000) / 1000;
}

/**
 * Calculate slugging percentage
 */
function calculateSlg(
  hits: number,
  doubles: number,
  triples: number,
  homeRuns: number,
  atBats: number
): number | undefined {
  if (atBats === 0) return undefined;
  const totalBases = hits + doubles + 2 * triples + 3 * homeRuns;
  return Math.round((totalBases / atBats) * 1000) / 1000;
}

/**
 * Parse batting stats from a row
 */
function parseBattingStats(row: BattingRow): BattingStats {
  const games = parseInt(row.G) || 0;
  const atBats = parseInt(row.AB) || 0;
  const hits = parseInt(row.H) || 0;
  const doubles = parseInt(row['2B']) || 0;
  const triples = parseInt(row['3B']) || 0;
  const homeRuns = parseInt(row.HR) || 0;
  const walks = parseInt(row.BB) || 0;
  const hbp = parseInt(row.HBP) || 0;
  const sf = parseInt(row.SF) || 0;

  // Calculate plate appearances
  const plateAppearances = atBats + walks + hbp + (parseInt(row.SH) || 0) + sf;

  return {
    games,
    plateAppearances,
    atBats,
    runs: parseInt(row.R) || 0,
    hits,
    doubles,
    triples,
    homeRuns,
    rbi: parseInt(row.RBI) || 0,
    walks,
    strikeouts: parseInt(row.SO) || 0,
    stolenBases: parseInt(row.SB) || 0,
    caughtStealing: parseInt(row.CS) || 0,
    avg: calculateAvg(hits, atBats),
    obp: calculateObp(hits, walks, hbp, atBats, sf),
    slg: calculateSlg(hits, doubles, triples, homeRuns, atBats),
  };
}

/**
 * Parse pitching stats from a row
 */
function parsePitchingStats(row: PitchingRow): PitchingStats {
  const ipOuts = parseInt(row.IPouts) || 0;
  const earnedRuns = parseInt(row.ER) || 0;

  // Calculate ERA (earned runs per 9 innings)
  let era: number | undefined;
  if (ipOuts > 0) {
    const innings = ipOuts / 3;
    era = Math.round((earnedRuns / innings) * 9 * 100) / 100;
  }

  // Calculate WHIP
  const hits = parseInt(row.H) || 0;
  const walks = parseInt(row.BB) || 0;
  let whip: number | undefined;
  if (ipOuts > 0) {
    const innings = ipOuts / 3;
    whip = Math.round(((walks + hits) / innings) * 100) / 100;
  }

  return {
    games: parseInt(row.G) || 0,
    gamesStarted: parseInt(row.GS) || 0,
    wins: parseInt(row.W) || 0,
    losses: parseInt(row.L) || 0,
    saves: parseInt(row.SV) || 0,
    inningsOuts: ipOuts,
    hits,
    runs: parseInt(row.R) || 0,
    earnedRuns,
    walks,
    strikeouts: parseInt(row.SO) || 0,
    homeRuns: parseInt(row.HR) || 0,
    era,
    whip,
  };
}

/**
 * Merge batting stats from multiple stints in the same season
 */
function mergeBattingStats(existing: BattingStats, additional: BattingStats): BattingStats {
  const merged: BattingStats = {
    games: existing.games + additional.games,
    plateAppearances: existing.plateAppearances + additional.plateAppearances,
    atBats: existing.atBats + additional.atBats,
    runs: existing.runs + additional.runs,
    hits: existing.hits + additional.hits,
    doubles: existing.doubles + additional.doubles,
    triples: existing.triples + additional.triples,
    homeRuns: existing.homeRuns + additional.homeRuns,
    rbi: existing.rbi + additional.rbi,
    walks: existing.walks + additional.walks,
    strikeouts: existing.strikeouts + additional.strikeouts,
    stolenBases: existing.stolenBases + additional.stolenBases,
    caughtStealing: existing.caughtStealing + additional.caughtStealing,
  };

  // Recalculate rate stats
  merged.avg = calculateAvg(merged.hits, merged.atBats);
  merged.slg = calculateSlg(merged.hits, merged.doubles, merged.triples, merged.homeRuns, merged.atBats);

  return merged;
}

/**
 * Merge pitching stats from multiple stints in the same season
 */
function mergePitchingStats(existing: PitchingStats, additional: PitchingStats): PitchingStats {
  const merged: PitchingStats = {
    games: existing.games + additional.games,
    gamesStarted: existing.gamesStarted + additional.gamesStarted,
    wins: existing.wins + additional.wins,
    losses: existing.losses + additional.losses,
    saves: existing.saves + additional.saves,
    inningsOuts: existing.inningsOuts + additional.inningsOuts,
    hits: existing.hits + additional.hits,
    runs: existing.runs + additional.runs,
    earnedRuns: existing.earnedRuns + additional.earnedRuns,
    walks: existing.walks + additional.walks,
    strikeouts: existing.strikeouts + additional.strikeouts,
    homeRuns: existing.homeRuns + additional.homeRuns,
  };

  // Recalculate rate stats
  if (merged.inningsOuts > 0) {
    const innings = merged.inningsOuts / 3;
    merged.era = Math.round((merged.earnedRuns / innings) * 9 * 100) / 100;
    merged.whip = Math.round(((merged.walks + merged.hits) / innings) * 100) / 100;
  }

  return merged;
}

/**
 * Load player seasons from Lahman data
 */
export async function loadPlayerSeasons(
  dataDir: string,
  startYear?: number,
  endYear?: number
): Promise<number> {
  const lahmanDir = join(dataDir, 'reference', 'lahman');

  if (!existsSync(lahmanDir)) {
    console.log('Lahman directory not found. Run: npm run download -- --lahman');
    return 0;
  }

  console.log('Loading player seasons from Lahman data...');
  console.log(`  Source: ${lahmanDir}`);

  // Build people lookup for names
  console.log('  Building player name lookup...');
  await buildPeopleLookup(lahmanDir);
  console.log(`    ${peopleLookup.size} players indexed`);

  // Map to aggregate player-seasons
  // Key: playerId-yearId
  const playerSeasons = new Map<string, PlayerSeason>();

  // Process batting data
  const battingPath = join(lahmanDir, LAHMAN.files.batting);
  if (existsSync(battingPath)) {
    console.log('  Processing batting stats...');
    let battingCount = 0;

    for await (const { row, headers } of streamCSV(battingPath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers) as unknown as BattingRow;

      const season = parseInt(obj.yearID) || 0;

      // Filter by year range
      if (startYear && season < startYear) continue;
      if (endYear && season > endYear) continue;

      const key = `${obj.playerID}-${season}`;
      const battingStats = parseBattingStats(obj);

      if (playerSeasons.has(key)) {
        const existing = playerSeasons.get(key)!;
        // Add team to list if not present
        if (!existing.teams.includes(obj.teamID)) {
          existing.teams.push(obj.teamID);
        }
        // Merge batting stats
        if (existing.batting) {
          existing.batting = mergeBattingStats(existing.batting, battingStats);
        } else {
          existing.batting = battingStats;
        }
      } else {
        const name = peopleLookup.get(obj.playerID);
        playerSeasons.set(key, {
          playerId: obj.playerID,
          season,
          teams: [obj.teamID],
          positions: [],
          batting: battingStats,
        });
      }
      battingCount++;
    }
    console.log(`    Processed ${battingCount.toLocaleString()} batting records`);
  }

  // Process pitching data
  const pitchingPath = join(lahmanDir, LAHMAN.files.pitching);
  if (existsSync(pitchingPath)) {
    console.log('  Processing pitching stats...');
    let pitchingCount = 0;

    for await (const { row, headers } of streamCSV(pitchingPath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers) as unknown as PitchingRow;

      const season = parseInt(obj.yearID) || 0;

      // Filter by year range
      if (startYear && season < startYear) continue;
      if (endYear && season > endYear) continue;

      const key = `${obj.playerID}-${season}`;
      const pitchingStats = parsePitchingStats(obj);

      if (playerSeasons.has(key)) {
        const existing = playerSeasons.get(key)!;
        // Add team to list if not present
        if (!existing.teams.includes(obj.teamID)) {
          existing.teams.push(obj.teamID);
        }
        // Add P to positions if not present
        if (!existing.positions.includes('P')) {
          existing.positions.push('P');
        }
        // Merge pitching stats
        if (existing.pitching) {
          existing.pitching = mergePitchingStats(existing.pitching, pitchingStats);
        } else {
          existing.pitching = pitchingStats;
        }
      } else {
        playerSeasons.set(key, {
          playerId: obj.playerID,
          season,
          teams: [obj.teamID],
          positions: ['P'],
          pitching: pitchingStats,
        });
      }
      pitchingCount++;
    }
    console.log(`    Processed ${pitchingCount.toLocaleString()} pitching records`);
  }

  // Insert into MongoDB
  console.log('  Inserting into MongoDB...');
  const collection = getCollection<PlayerSeason>(COLLECTIONS.PLAYER_SEASONS);
  const records = Array.from(playerSeasons.values());

  if (records.length > 0) {
    const batches = batch(records, BATCH_SIZE);
    let inserted = 0;
    for (const b of batches) {
      await collection.insertMany(b, { ordered: false }).catch(() => {});
      inserted += b.length;
      process.stdout.write(`\r    Inserted ${inserted.toLocaleString()} player seasons`);
    }
    console.log('');
  }

  const yearRange = startYear && endYear ? ` (${startYear}-${endYear})` : '';
  console.log(`  Total player seasons loaded: ${records.length.toLocaleString()}${yearRange}`);

  // Clear lookup to free memory
  peopleLookup.clear();

  return records.length;
}

/**
 * Load player seasons for a specific year range
 * Wrapper to match loader pattern
 */
export async function loadPlayerSeasonsForRange(
  dataDir: string,
  startYear: number,
  endYear: number
): Promise<number> {
  return loadPlayerSeasons(dataDir, startYear, endYear);
}
