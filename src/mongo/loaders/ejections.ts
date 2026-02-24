/**
 * Ejections Loader
 *
 * Loads ejection data from Retrosheet ejections file.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Ejection } from '../schema.js';
import { streamCSV, rowToObject, parseDate, parseInt, extractSeasonFromGameId } from '../parsers.js';
import { EJECTIONS_COLUMNS, getColumn, validateColumns } from '../../config/columns.js';

/**
 * Load ejections from ejections file
 */
export async function loadEjections(
  dataDir: string,
  startYear?: number,
  endYear?: number
): Promise<number> {
  const filePath = join(dataDir, 'reference', 'ejections.csv');

  if (!existsSync(filePath)) {
    console.log('  Ejections file not found, skipping');
    console.log(`  Expected: ${filePath}`);
    return 0;
  }

  console.log('Loading ejections...');
  const collection = getCollection<Ejection>(COLLECTIONS.EJECTIONS);
  const ejections: Ejection[] = [];
  let skipped = 0;
  let validated = false;

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;

    // Validate columns on first row
    if (!validated) {
      validateColumns(headers, EJECTIONS_COLUMNS, 'ejections.csv');
      validated = true;
    }

    const obj = rowToObject(row, headers);
    const gameId = getColumn(obj, EJECTIONS_COLUMNS.gameId);
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

    const dateStr = getColumn(obj, EJECTIONS_COLUMNS.date);
    const date = parseDate(dateStr);
    if (!date) continue;

    // Determine role - Retrosheet uses P=player, M=manager, C=coach
    let role: 'player' | 'manager' | 'coach' = 'player';
    const jobType = getColumn(obj, EJECTIONS_COLUMNS.job).toUpperCase();
    if (jobType === 'M' || jobType.includes('MANAGER')) role = 'manager';
    else if (jobType === 'C' || jobType.includes('COACH')) role = 'coach';

    ejections.push({
      gameId,
      date,
      season,
      ejectee: {
        playerId: getColumn(obj, EJECTIONS_COLUMNS.ejecteeId),
        name: getColumn(obj, EJECTIONS_COLUMNS.ejecteeName),
        role,
        teamId: getColumn(obj, EJECTIONS_COLUMNS.team),
      },
      umpire: {
        umpireId: getColumn(obj, EJECTIONS_COLUMNS.umpireId),
        name: getColumn(obj, EJECTIONS_COLUMNS.umpireName),
      },
      inning: parseInt(getColumn(obj, EJECTIONS_COLUMNS.inning)),
      reason: getColumn(obj, EJECTIONS_COLUMNS.reason) || undefined,
    });
  }

  if (ejections.length > 0) {
    await collection.insertMany(ejections, { ordered: false }).catch(() => {});
  }

  console.log(`  Loaded ${ejections.length} ejections (skipped ${skipped} outside date range)`);
  return ejections.length;
}
