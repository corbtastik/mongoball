/**
 * Pitches Loader
 *
 * Loads Statcast pitch-by-pitch data into MongoDB.
 * Handles streaming for large files.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Pitch, PitchParticipant, PitchData, BattedBall } from '../schema.js';
import { streamCSV, parseDate, parseInt, parseFloat, parseSide } from '../parsers.js';

const BATCH_SIZE = 5000;

// Statcast CSV column names
interface StatcastRow {
  game_date: string;
  game_pk: string;
  at_bat_number: string;
  pitch_number: string;
  inning: string;
  inning_topbot: string;
  pitcher: string;
  player_name: string;
  p_throws: string;
  batter: string;
  stand: string;
  pitch_type: string;
  release_speed: string;
  release_spin_rate: string;
  release_extension: string;
  pfx_x: string;
  pfx_z: string;
  plate_x: string;
  plate_z: string;
  zone: string;
  balls: string;
  strikes: string;
  outs_when_up: string;
  type: string;
  description: string;
  events: string;
  launch_speed: string;
  launch_angle: string;
  hit_distance_sc: string;
  hc_x: string;
  hc_y: string;
  bb_type: string;
  estimated_ba_using_speedangle: string;
  estimated_woba_using_speedangle: string;
  home_team: string;
  away_team: string;
}

function buildGameId(row: StatcastRow): string {
  // Build Retrosheet-style game ID from Statcast data
  // Format: TEAMYYYYMMDD# (e.g., TEX202311010)
  const date = row.game_date.replace(/-/g, '');
  const homeTeam = row.home_team?.toUpperCase() || 'UNK';
  return `${homeTeam}${date}0`;
}

function parsePitcher(row: StatcastRow): PitchParticipant {
  const nameParts = (row.player_name || '').split(', ');
  const name = nameParts.length === 2
    ? `${nameParts[1]} ${nameParts[0]}`
    : row.player_name;

  return {
    playerId: parseInt(row.pitcher) || 0,
    name: name || '',
    side: parseSide(row.p_throws),
  };
}

function parseBatter(row: StatcastRow): PitchParticipant {
  return {
    playerId: parseInt(row.batter) || 0,
    name: '', // Statcast doesn't include batter name directly
    side: parseSide(row.stand),
  };
}

function parsePitchData(row: StatcastRow): PitchData {
  return {
    type: row.pitch_type || 'UN',
    speed: parseFloat(row.release_speed) || 0,
    spinRate: parseFloat(row.release_spin_rate),
    extension: parseFloat(row.release_extension),
    movement: {
      horizontal: parseFloat(row.pfx_x) || 0,
      vertical: parseFloat(row.pfx_z) || 0,
    },
    location: {
      x: parseFloat(row.plate_x) || 0,
      z: parseFloat(row.plate_z) || 0,
    },
    zone: parseInt(row.zone),
  };
}

function parseBattedBall(row: StatcastRow): BattedBall | undefined {
  const exitVelo = parseFloat(row.launch_speed);
  const launchAngle = parseFloat(row.launch_angle);

  // Only include if there's batted ball data
  if (exitVelo === undefined && launchAngle === undefined) {
    return undefined;
  }

  return {
    exitVelocity: exitVelo || 0,
    launchAngle: launchAngle || 0,
    distance: parseFloat(row.hit_distance_sc),
    location: {
      x: parseFloat(row.hc_x) || 0,
      y: parseFloat(row.hc_y) || 0,
    },
    type: row.bb_type || '',
    outcome: row.events || '',
    expectedAvg: parseFloat(row.estimated_ba_using_speedangle),
    expectedSlg: parseFloat(row.estimated_woba_using_speedangle),
  };
}

function parseResultType(type: string): string {
  switch (type) {
    case 'B': return 'ball';
    case 'S': return 'strike';
    case 'X': return 'in_play';
    default: return type;
  }
}

/**
 * Load pitches for a single season
 */
export async function loadPitchesForSeason(
  dataDir: string,
  season: number
): Promise<number> {
  // Try multiple possible paths (prefer seasons/{year}/statcast structure)
  const possiblePaths = [
    join(dataDir, 'seasons', String(season), 'statcast', `${season}_statcast.csv`),
    join(dataDir, String(season), 'statcast', `${season}_statcast.csv`),
    join(dataDir, String(season), `${season}_statcast.csv`),
    join(dataDir, 'statcast', `${season}_statcast.csv`),
    join(dataDir, `${season}_statcast.csv`),
  ];

  let filePath: string | null = null;
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log(`  No Statcast file found for ${season}`);
    return 0;
  }

  console.log(`  Loading pitches from ${filePath}...`);
  const collection = getCollection<Pitch>(COLLECTIONS.PITCHES);

  const pitches: Pitch[] = [];
  let count = 0;

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;

    // Build row object
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] || '';
    }
    const statcast = obj as unknown as StatcastRow;

    // Skip invalid rows
    if (!statcast.game_date || !statcast.pitcher) continue;

    const gameId = buildGameId(statcast);
    const date = parseDate(statcast.game_date);
    if (!date) continue;

    const pitch: Pitch = {
      gameId,
      season,
      date,
      inning: parseInt(statcast.inning) || 1,
      halfInning: statcast.inning_topbot === 'Top' ? 'top' : 'bottom',
      atBatNumber: parseInt(statcast.at_bat_number) || 0,
      pitchNumber: parseInt(statcast.pitch_number) || 0,
      pitcher: parsePitcher(statcast),
      batter: parseBatter(statcast),
      pitch: parsePitchData(statcast),
      count: {
        balls: parseInt(statcast.balls) || 0,
        strikes: parseInt(statcast.strikes) || 0,
        outs: parseInt(statcast.outs_when_up) || 0,
      },
      result: {
        type: parseResultType(statcast.type),
        description: statcast.description || '',
      },
      batted: parseBattedBall(statcast),
    };

    pitches.push(pitch);
    count++;

    // Batch insert
    if (pitches.length >= BATCH_SIZE) {
      await collection.insertMany(pitches, { ordered: false }).catch(() => {});
      process.stdout.write(`\r    Loaded ${count.toLocaleString()} pitches`);
      pitches.length = 0;
    }
  }

  // Insert remaining
  if (pitches.length > 0) {
    await collection.insertMany(pitches, { ordered: false }).catch(() => {});
  }

  console.log(`\r    Loaded ${count.toLocaleString()} pitches for ${season}`);
  return count;
}

/**
 * Load pitches for all seasons in a range
 */
export async function loadPitches(
  dataDir: string,
  startYear: number,
  endYear: number
): Promise<number> {
  console.log(`Loading Statcast pitches (${startYear}-${endYear})...`);

  // Statcast only available 2015+
  const effectiveStart = Math.max(startYear, 2015);
  if (effectiveStart > endYear) {
    console.log('  No Statcast data available for this range (requires 2015+)');
    return 0;
  }

  let total = 0;
  for (let year = effectiveStart; year <= endYear; year++) {
    const count = await loadPitchesForSeason(dataDir, year);
    total += count;
  }

  console.log(`  Total pitches loaded: ${total.toLocaleString()}`);
  return total;
}
