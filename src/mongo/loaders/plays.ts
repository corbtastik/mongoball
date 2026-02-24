/**
 * Plays Loader
 *
 * Loads play-by-play data from Retrosheet event files (.EVA, .EVN).
 *
 * Event file format:
 *   id,TEAMYYYYMMDD#     - Game identifier
 *   info,key,value       - Game metadata
 *   start,id,name,tm,bo,pos - Starting lineup
 *   play,inn,tm,id,cnt,pitch,event - Play event
 *   sub,id,name,tm,bo,pos - Substitution
 *   com,"text"           - Comment
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Play, PlayEvent, RunnerAdvance } from '../schema.js';
import { parseCSVLine, batch } from '../parsers.js';

const BATCH_SIZE = 2000;

// Event type mapping from Retrosheet codes
const EVENT_TYPES: Record<string, string> = {
  S: 'single',
  D: 'double',
  T: 'triple',
  H: 'home_run',
  HR: 'home_run',
  W: 'walk',
  IW: 'intentional_walk',
  I: 'intentional_walk',
  K: 'strikeout',
  NP: 'no_play',
  BK: 'balk',
  CS: 'caught_stealing',
  DI: 'defensive_indifference',
  OA: 'other_advance',
  PB: 'passed_ball',
  WP: 'wild_pitch',
  PO: 'pickoff',
  POCS: 'pickoff_caught_stealing',
  SB: 'stolen_base',
  FLE: 'error',
  E: 'error',
  FC: 'fielders_choice',
  HP: 'hit_by_pitch',
  C: 'catcher_interference',
};

interface GameContext {
  gameId: string;
  season: number;
  date: string;
  homeTeam: string;
  visitingTeam: string;
  playNumber: number;
  runnersOn: {
    first?: string;
    second?: string;
    third?: string;
  };
}

/**
 * Parse the count string (e.g., "32" -> balls: 3, strikes: 2)
 */
function parseCount(countStr: string): { balls: number; strikes: number } {
  if (!countStr || countStr.length < 2) {
    return { balls: 0, strikes: 0 };
  }
  return {
    balls: parseInt(countStr[0], 10) || 0,
    strikes: parseInt(countStr[1], 10) || 0,
  };
}

/**
 * Determine the primary event type from a Retrosheet event code
 */
function parseEventType(eventCode: string): string {
  if (!eventCode) return 'unknown';

  // Check for common patterns
  const code = eventCode.toUpperCase();

  // Outs (numbers indicate fielders)
  if (/^\d+/.test(code)) {
    if (code.includes('GDP') || code.includes('DP')) return 'ground_into_double_play';
    if (code.includes('TP')) return 'triple_play';
    if (code.includes('LDP') || code.includes('LTP')) return 'lined_into_double_play';
    if (code.includes('/FO')) return 'force_out';
    if (code.includes('/L')) return 'line_out';
    if (code.includes('/F')) return 'fly_out';
    if (code.includes('/P')) return 'pop_out';
    if (code.includes('/G')) return 'ground_out';
    return 'out';
  }

  // Check mapped event types
  for (const [key, value] of Object.entries(EVENT_TYPES)) {
    if (code.startsWith(key)) return value;
  }

  return 'unknown';
}

/**
 * Parse runner advances from the event string
 * Format: .1-3;2-H;B-2 (runner from 1st to 3rd, 2nd scores, batter to 2nd)
 */
function parseAdvances(eventCode: string, batterId: string): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];

  // Look for advances after the main event (separated by .)
  const advanceMatch = eventCode.match(/\.(.+)$/);
  if (!advanceMatch) return advances;

  const advanceParts = advanceMatch[1].split(';');
  for (const part of advanceParts) {
    // Parse format: FROM-TO or FROM-TO(MODIFIER)
    const match = part.match(/^([B123])-([123H]|out)/i);
    if (match) {
      const from = match[1].toUpperCase();
      const to = match[2].toUpperCase();
      const isOut = to === 'OUT' || part.includes('(');

      advances.push({
        runnerId: from === 'B' ? batterId : '',
        from,
        to: isOut ? 'out' : to,
        isScored: to === 'H',
        isOut,
      });
    }
  }

  return advances;
}

/**
 * Count RBIs from advances (runners scoring, excluding errors)
 */
function countRbi(advances: RunnerAdvance[], eventCode: string): number {
  // No RBI on errors or certain plays
  if (eventCode.includes('(NR)') || eventCode.includes('/E')) {
    return 0;
  }

  return advances.filter((a) => a.isScored && !a.isOut).length;
}

/**
 * Count outs recorded from event
 */
function countOuts(eventCode: string, advances: RunnerAdvance[]): number {
  let outs = 0;

  // Count outs in advances
  outs += advances.filter((a) => a.isOut).length;

  // Check for double play
  if (eventCode.includes('DP') || eventCode.includes('GDP')) {
    outs = Math.max(outs, 2);
  }

  // Check for triple play
  if (eventCode.includes('TP')) {
    outs = Math.max(outs, 3);
  }

  // Simple out (fielder codes without advances)
  if (/^\d+(?:\/|$)/.test(eventCode) && outs === 0) {
    outs = 1;
  }

  // Strikeout
  if (eventCode.startsWith('K')) {
    outs = Math.max(outs, 1);
  }

  return outs;
}

/**
 * Stream read a Retrosheet event file
 */
async function* streamEventFile(
  filePath: string
): AsyncGenerator<{ type: string; fields: string[] }> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    if (fields.length > 0) {
      yield { type: fields[0], fields };
    }
  }
}

/**
 * Load plays from a single event file
 */
async function loadPlaysFromFile(filePath: string, season: number): Promise<Play[]> {
  const plays: Play[] = [];
  let ctx: GameContext = {
    gameId: '',
    season,
    date: '',
    homeTeam: '',
    visitingTeam: '',
    playNumber: 0,
    runnersOn: {},
  };

  for await (const { type, fields } of streamEventFile(filePath)) {
    switch (type) {
      case 'id':
        // New game - reset context
        ctx = {
          gameId: fields[1] || '',
          season,
          date: '',
          homeTeam: '',
          visitingTeam: '',
          playNumber: 0,
          runnersOn: {},
        };
        break;

      case 'info':
        // Game info
        if (fields[1] === 'date') ctx.date = fields[2];
        if (fields[1] === 'hometeam') ctx.homeTeam = fields[2];
        if (fields[1] === 'visteam') ctx.visitingTeam = fields[2];
        break;

      case 'play': {
        // Play event: play,inning,team,batter,count,pitches,event
        const inning = parseInt(fields[1], 10) || 1;
        const team = fields[2] === '0' ? 'top' : 'bottom';
        const batterId = fields[3] || '';
        const countStr = fields[4] || '';
        const pitchSequence = fields[5] || '';
        const eventCode = fields[6] || '';

        // Skip no-play events
        if (eventCode.startsWith('NP')) break;

        ctx.playNumber++;
        const count = parseCount(countStr);
        const advances = parseAdvances(eventCode, batterId);

        const play: Play = {
          gameId: ctx.gameId,
          season: ctx.season,
          inning,
          halfInning: team as 'top' | 'bottom',
          playNumber: ctx.playNumber,
          batterId,
          pitcherId: '', // Would need to track from substitutions
          count,
          pitchSequence: pitchSequence || undefined,
          event: {
            code: eventCode,
            type: parseEventType(eventCode),
            description: undefined,
          },
          runnersOn: { ...ctx.runnersOn },
          advances,
          rbi: countRbi(advances, eventCode),
          outsRecorded: countOuts(eventCode, advances),
        };

        plays.push(play);

        // Update runners on base for next play
        updateRunnersOnBase(ctx, advances, batterId, eventCode);
        break;
      }
    }
  }

  return plays;
}

/**
 * Update runners on base after a play
 */
function updateRunnersOnBase(
  ctx: GameContext,
  advances: RunnerAdvance[],
  batterId: string,
  eventCode: string
): void {
  const newRunners: typeof ctx.runnersOn = {};

  // Process advances
  for (const adv of advances) {
    if (!adv.isOut && adv.to !== 'H') {
      const base = adv.to === '1' ? 'first' : adv.to === '2' ? 'second' : 'third';
      newRunners[base] = adv.from === 'B' ? batterId : adv.runnerId;
    }
  }

  // If batter reached base without explicit advance
  const reachedBase = /^[SDTH]|^W|^IW|^HP|^E|^FC/.test(eventCode);
  if (reachedBase && !advances.some((a) => a.from === 'B')) {
    // Determine base reached
    if (eventCode.startsWith('S') || eventCode.startsWith('W') || eventCode.startsWith('HP')) {
      newRunners.first = batterId;
    } else if (eventCode.startsWith('D')) {
      newRunners.second = batterId;
    } else if (eventCode.startsWith('T')) {
      newRunners.third = batterId;
    }
    // Home runs don't leave runners
  }

  // Keep runners who weren't involved in advances
  if (!advances.some((a) => a.from === '1') && ctx.runnersOn.first) {
    newRunners.first = ctx.runnersOn.first;
  }
  if (!advances.some((a) => a.from === '2') && ctx.runnersOn.second) {
    newRunners.second = ctx.runnersOn.second;
  }
  if (!advances.some((a) => a.from === '3') && ctx.runnersOn.third) {
    newRunners.third = ctx.runnersOn.third;
  }

  ctx.runnersOn = newRunners;
}

/**
 * Find all event files for a season
 */
function findEventFiles(retrosheetDir: string, season: number): string[] {
  if (!existsSync(retrosheetDir)) return [];

  const files = readdirSync(retrosheetDir);
  const eventFiles: string[] = [];

  for (const file of files) {
    // Match .EVA, .EVN, .EVE files for this season
    if (file.startsWith(String(season)) && /\.EV[ANE]$/i.test(file)) {
      eventFiles.push(join(retrosheetDir, file));
    }
  }

  return eventFiles.sort();
}

/**
 * Load plays for a single season
 */
export async function loadPlaysForSeason(dataDir: string, season: number): Promise<number> {
  // Try multiple possible paths
  const possibleDirs = [
    join(dataDir, 'seasons', String(season), 'retrosheet'),
    join(dataDir, String(season), 'retrosheet'),
    join(dataDir, String(season)),
  ];

  let retrosheetDir: string | null = null;
  for (const dir of possibleDirs) {
    if (existsSync(dir)) {
      retrosheetDir = dir;
      break;
    }
  }

  if (!retrosheetDir) {
    console.log(`  No Retrosheet directory found for ${season}`);
    return 0;
  }

  const eventFiles = findEventFiles(retrosheetDir, season);
  if (eventFiles.length === 0) {
    console.log(`  No event files found for ${season}`);
    return 0;
  }

  console.log(`  Loading plays from ${eventFiles.length} event files for ${season}...`);
  const collection = getCollection<Play>(COLLECTIONS.PLAYS);

  let total = 0;
  for (const filePath of eventFiles) {
    const plays = await loadPlaysFromFile(filePath, season);
    if (plays.length > 0) {
      const batches = batch(plays, BATCH_SIZE);
      for (const b of batches) {
        await collection.insertMany(b, { ordered: false }).catch(() => {});
      }
      total += plays.length;
    }
  }

  console.log(`    Loaded ${total.toLocaleString()} plays for ${season}`);
  return total;
}

/**
 * Load plays for all seasons in a range
 */
export async function loadPlays(
  dataDir: string,
  startYear: number,
  endYear: number
): Promise<number> {
  console.log(`Loading plays (${startYear}-${endYear})...`);

  let total = 0;
  for (let year = startYear; year <= endYear; year++) {
    const count = await loadPlaysForSeason(dataDir, year);
    total += count;
  }

  console.log(`  Total plays loaded: ${total.toLocaleString()}`);
  return total;
}
