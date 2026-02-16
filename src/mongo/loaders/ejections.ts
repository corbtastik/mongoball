/**
 * Ejections Loader
 *
 * Loads ejection data from Retrosheet ejections file.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Ejection } from '../schema.js';
import { streamCSV, parseDate, parseInt, extractSeasonFromGameId } from '../parsers.js';

/**
 * Load ejections from ejections file
 */
export async function loadEjections(
  dataDir: string,
  startYear?: number,
  endYear?: number
): Promise<number> {
  // Try multiple possible paths
  const possiblePaths = [
    join(dataDir, 'reference', 'ejections.csv'),
    join(dataDir, 'ejections.csv'),
  ];

  let filePath: string | null = null;
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log('  Ejections file not found, skipping');
    return 0;
  }

  console.log('Loading ejections...');
  const collection = getCollection<Ejection>(COLLECTIONS.EJECTIONS);

  const ejections: Ejection[] = [];
  let skipped = 0;

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;

    // Build row object
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] || '';
    }

    const gameId = obj['GAME.ID'] || obj['game_id'] || '';
    if (!gameId) continue;

    const season = extractSeasonFromGameId(gameId);

    // Filter by year range if specified
    if (startYear && season < startYear) {
      skipped++;
      continue;
    }
    if (endYear && season > endYear) {
      skipped++;
      continue;
    }

    const dateStr = obj['DATE'] || obj['date'] || '';
    const date = parseDate(dateStr);
    if (!date) continue;

    // Determine role
    let role: 'player' | 'manager' | 'coach' = 'player';
    const jobType = (obj['JOB'] || obj['job'] || '').toLowerCase();
    if (jobType.includes('manager')) role = 'manager';
    else if (jobType.includes('coach')) role = 'coach';

    ejections.push({
      gameId,
      date,
      season,
      ejectee: {
        playerId: obj['EJECTEE.ID'] || obj['ejectee_id'] || '',
        name: obj['EJECTEE.NAME'] || obj['ejectee_name'] || '',
        role,
        teamId: obj['TEAM'] || obj['team'] || '',
      },
      umpire: {
        umpireId: obj['UMPIRE.ID'] || obj['umpire_id'] || '',
        name: obj['UMPIRE.NAME'] || obj['umpire_name'] || '',
      },
      inning: parseInt(obj['INNING'] || obj['inning']),
      reason: obj['REASON'] || obj['reason'] || undefined,
    });
  }

  if (ejections.length > 0) {
    await collection.insertMany(ejections, { ordered: false }).catch(() => {});
  }

  console.log(`  Loaded ${ejections.length} ejections (skipped ${skipped} outside date range)`);
  return ejections.length;
}
