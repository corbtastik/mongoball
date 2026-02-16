/**
 * Rosters Loader
 *
 * Loads roster data from Retrosheet .ROS files.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Roster, RosterPlayer } from '../schema.js';
import { parseCSVLine, parseSide } from '../parsers.js';

/**
 * Parse a roster file
 */
function parseRosterFile(
  filePath: string,
  teamId: string,
  season: number
): Roster {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  const players: RosterPlayer[] = [];

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    // Format: playerid,last,first,bats,throws,team,pos
    players.push({
      playerId: fields[0],
      name: {
        first: fields[2],
        last: fields[1],
      },
      position: fields[6],
      bats: parseSide(fields[3]),
      throws: parseSide(fields[4]),
    });
  }

  return {
    teamId,
    season,
    players,
  };
}

/**
 * Load rosters for a single season
 */
export async function loadRostersForSeason(
  dataDir: string,
  season: number
): Promise<number> {
  // Find roster directory (prefer seasons/{year}/retrosheet structure)
  const possibleDirs = [
    join(dataDir, 'seasons', String(season), 'retrosheet'),
    join(dataDir, String(season), 'retrosheet'),
    join(dataDir, String(season)),
    join(dataDir, 'retrosheet'),
    dataDir,
  ];

  let rosterDir: string | null = null;
  for (const d of possibleDirs) {
    if (existsSync(d)) {
      const files = readdirSync(d).filter((f) => f.endsWith(`${season}.ROS`));
      if (files.length > 0) {
        rosterDir = d;
        break;
      }
    }
  }

  if (!rosterDir) {
    console.log(`  No roster files found for ${season}`);
    return 0;
  }

  const rosterFiles = readdirSync(rosterDir).filter((f) =>
    f.endsWith(`${season}.ROS`)
  );

  if (rosterFiles.length === 0) {
    return 0;
  }

  console.log(`  Loading ${rosterFiles.length} roster files for ${season}...`);
  const collection = getCollection<Roster>(COLLECTIONS.ROSTERS);

  const rosters: Roster[] = [];

  for (const filename of rosterFiles) {
    // Extract team ID from filename (e.g., "TEX2023.ROS" -> "TEX")
    const teamId = filename.replace(`${season}.ROS`, '');
    const filePath = join(rosterDir, filename);

    const roster = parseRosterFile(filePath, teamId, season);
    rosters.push(roster);
  }

  if (rosters.length > 0) {
    await collection.insertMany(rosters, { ordered: false }).catch(() => {});
  }

  console.log(`    Loaded ${rosters.length} rosters for ${season}`);
  return rosters.length;
}

/**
 * Load rosters for all seasons in a range
 */
export async function loadRosters(
  dataDir: string,
  startYear: number,
  endYear: number
): Promise<number> {
  console.log(`Loading rosters (${startYear}-${endYear})...`);

  let total = 0;
  for (let year = startYear; year <= endYear; year++) {
    const count = await loadRostersForSeason(dataDir, year);
    total += count;
  }

  console.log(`  Total rosters loaded: ${total.toLocaleString()}`);
  return total;
}
