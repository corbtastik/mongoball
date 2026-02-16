/**
 * Games Loader
 *
 * Loads game data from Retrosheet game logs.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Game, TeamGameInfo, GamePitchers, GameUmpires } from '../schema.js';
import { parseCSVLine, parseDate, parseInt, batch } from '../parsers.js';

const BATCH_SIZE = 500;

// Game log field positions (0-indexed)
// Reference: https://www.retrosheet.org/gamelogs/glfields.txt
const GL = {
  DATE: 0,
  GAME_NUMBER: 1,
  DAY_OF_WEEK: 2,
  VISITING_TEAM: 3,
  VISITING_LEAGUE: 4,
  VISITING_GAME_NUMBER: 5,
  HOME_TEAM: 6,
  HOME_LEAGUE: 7,
  HOME_GAME_NUMBER: 8,
  VISITING_SCORE: 9,
  HOME_SCORE: 10,
  GAME_LENGTH_OUTS: 11,
  DAY_NIGHT: 12,
  COMPLETION_INFO: 13,
  FORFEIT_INFO: 14,
  PROTEST_INFO: 15,
  PARK_ID: 16,
  ATTENDANCE: 17,
  GAME_DURATION: 18,
  VISITING_LINESCORE: 19,
  HOME_LINESCORE: 20,
  VISITING_AB: 21,
  VISITING_HITS: 22,
  VISITING_DOUBLES: 23,
  VISITING_TRIPLES: 24,
  VISITING_HR: 25,
  VISITING_RBI: 26,
  VISITING_SH: 27,
  VISITING_SF: 28,
  VISITING_HBP: 29,
  VISITING_BB: 30,
  VISITING_IBB: 31,
  VISITING_K: 32,
  VISITING_SB: 33,
  VISITING_CS: 34,
  VISITING_GIDP: 35,
  VISITING_CI: 36,
  VISITING_LOB: 37,
  VISITING_PITCHERS_USED: 38,
  VISITING_ER: 39,
  VISITING_TER: 40,
  VISITING_WP: 41,
  VISITING_BALKS: 42,
  VISITING_PO: 43,
  VISITING_A: 44,
  VISITING_E: 45,
  VISITING_PASSED: 46,
  VISITING_DP: 47,
  VISITING_TP: 48,
  HOME_AB: 49,
  HOME_HITS: 50,
  HOME_DOUBLES: 51,
  HOME_TRIPLES: 52,
  HOME_HR: 53,
  HOME_RBI: 54,
  HOME_SH: 55,
  HOME_SF: 56,
  HOME_HBP: 57,
  HOME_BB: 58,
  HOME_IBB: 59,
  HOME_K: 60,
  HOME_SB: 61,
  HOME_CS: 62,
  HOME_GIDP: 63,
  HOME_CI: 64,
  HOME_LOB: 65,
  HOME_PITCHERS_USED: 66,
  HOME_ER: 67,
  HOME_TER: 68,
  HOME_WP: 69,
  HOME_BALKS: 70,
  HOME_PO: 71,
  HOME_A: 72,
  HOME_E: 73,
  HOME_PASSED: 74,
  HOME_DP: 75,
  HOME_TP: 76,
  HP_UMPIRE_ID: 77,
  HP_UMPIRE_NAME: 78,
  FIRST_UMPIRE_ID: 79,
  FIRST_UMPIRE_NAME: 80,
  SECOND_UMPIRE_ID: 81,
  SECOND_UMPIRE_NAME: 82,
  THIRD_UMPIRE_ID: 83,
  THIRD_UMPIRE_NAME: 84,
  LF_UMPIRE_ID: 85,
  LF_UMPIRE_NAME: 86,
  RF_UMPIRE_ID: 87,
  RF_UMPIRE_NAME: 88,
  VISITING_MANAGER_ID: 89,
  VISITING_MANAGER_NAME: 90,
  HOME_MANAGER_ID: 91,
  HOME_MANAGER_NAME: 92,
  WINNING_PITCHER_ID: 93,
  WINNING_PITCHER_NAME: 94,
  LOSING_PITCHER_ID: 95,
  LOSING_PITCHER_NAME: 96,
  SAVE_PITCHER_ID: 97,
  SAVE_PITCHER_NAME: 98,
  GWRBI_BATTER_ID: 99,
  GWRBI_BATTER_NAME: 100,
  VISITING_STARTING_PITCHER_ID: 101,
  VISITING_STARTING_PITCHER_NAME: 102,
  HOME_STARTING_PITCHER_ID: 103,
  HOME_STARTING_PITCHER_NAME: 104,
};

function buildGameId(fields: string[]): string {
  const dateStr = fields[GL.DATE];
  const homeTeam = fields[GL.HOME_TEAM];
  const gameNum = fields[GL.GAME_NUMBER] || '0';
  return `${homeTeam}${dateStr}${gameNum}`;
}

function parseLinescore(linescore: string): (number | string)[] {
  if (!linescore) return [];
  return linescore.split('').map((c) => {
    if (c === 'x') return 'x';
    const num = Number.parseInt(c, 10);
    return Number.isNaN(num) ? 0 : num;
  });
}

function buildTeamInfo(
  fields: string[],
  isHome: boolean
): TeamGameInfo {
  const prefix = isHome ? GL.HOME_TEAM : GL.VISITING_TEAM;
  const scoreIdx = isHome ? GL.HOME_SCORE : GL.VISITING_SCORE;
  const hitsIdx = isHome ? GL.HOME_HITS : GL.VISITING_HITS;
  const errorsIdx = isHome ? GL.HOME_E : GL.VISITING_E;

  return {
    teamId: fields[prefix] || '',
    name: '', // Would need team lookup
    score: parseInt(fields[scoreIdx]) || 0,
    hits: parseInt(fields[hitsIdx]) || 0,
    errors: parseInt(fields[errorsIdx]) || 0,
  };
}

function buildPitchers(fields: string[], isHome: boolean): GamePitchers {
  const starterIdx = isHome
    ? GL.HOME_STARTING_PITCHER_ID
    : GL.VISITING_STARTING_PITCHER_ID;

  return {
    starter: fields[starterIdx] || '',
    winner: fields[GL.WINNING_PITCHER_ID] || undefined,
    loser: fields[GL.LOSING_PITCHER_ID] || undefined,
    save: fields[GL.SAVE_PITCHER_ID] || undefined,
  };
}

function buildUmpires(fields: string[]): GameUmpires {
  return {
    home: fields[GL.HP_UMPIRE_ID] || undefined,
    first: fields[GL.FIRST_UMPIRE_ID] || undefined,
    second: fields[GL.SECOND_UMPIRE_ID] || undefined,
    third: fields[GL.THIRD_UMPIRE_ID] || undefined,
    left: fields[GL.LF_UMPIRE_ID] || undefined,
    right: fields[GL.RF_UMPIRE_ID] || undefined,
  };
}

/**
 * Load games for a single season
 */
export async function loadGamesForSeason(
  dataDir: string,
  season: number
): Promise<number> {
  // Try multiple possible paths (prefer seasons/{year}/retrosheet structure)
  const possiblePaths = [
    join(dataDir, 'seasons', String(season), 'retrosheet', `gl${season}.txt`),
    join(dataDir, String(season), 'retrosheet', `gl${season}.txt`),
    join(dataDir, String(season), `gl${season}.txt`),
    join(dataDir, 'retrosheet', `gl${season}.txt`),
    join(dataDir, `gl${season}.txt`),
  ];

  let filePath: string | null = null;
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log(`  No game log found for ${season}`);
    return 0;
  }

  console.log(`  Loading games from ${filePath}...`);
  const collection = getCollection<Game>(COLLECTIONS.GAMES);

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  const games: Game[] = [];

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 105) continue;

    const dateStr = fields[GL.DATE];
    const date = parseDate(dateStr);
    if (!date) continue;

    const game: Game = {
      gameId: buildGameId(fields),
      date,
      season,
      gameType: 'R', // Would need to determine from file source
      gameNumber: parseInt(fields[GL.GAME_NUMBER]) || 0,
      venue: {
        venueId: fields[GL.PARK_ID] || '',
        name: '', // Would need venue lookup
      },
      home: buildTeamInfo(fields, true),
      away: buildTeamInfo(fields, false),
      linescore: {
        home: parseLinescore(fields[GL.HOME_LINESCORE]),
        away: parseLinescore(fields[GL.VISITING_LINESCORE]),
      },
      homePitchers: buildPitchers(fields, true),
      awayPitchers: buildPitchers(fields, false),
      umpires: buildUmpires(fields),
      attendance: parseInt(fields[GL.ATTENDANCE]),
      duration: parseInt(fields[GL.GAME_DURATION]),
      dayNight: fields[GL.DAY_NIGHT] === 'D' ? 'D' : 'N',
      hasStatcast: season >= 2015,
      hasPlayByPlay: true,
    };

    games.push(game);
  }

  // Batch insert
  if (games.length > 0) {
    const batches = batch(games, BATCH_SIZE);
    for (const b of batches) {
      await collection.insertMany(b, { ordered: false }).catch(() => {});
    }
  }

  console.log(`    Loaded ${games.length.toLocaleString()} games for ${season}`);
  return games.length;
}

/**
 * Load games for all seasons in a range
 */
export async function loadGames(
  dataDir: string,
  startYear: number,
  endYear: number
): Promise<number> {
  console.log(`Loading games (${startYear}-${endYear})...`);

  let total = 0;
  for (let year = startYear; year <= endYear; year++) {
    const count = await loadGamesForSeason(dataDir, year);
    total += count;
  }

  console.log(`  Total games loaded: ${total.toLocaleString()}`);
  return total;
}
