/**
 * Venues Loader
 *
 * Loads ballpark/venue data from Retrosheet ballparks file.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Venue } from '../schema.js';
import { streamCSV, rowToObject, parseDate } from '../parsers.js';
import { BALLPARKS_COLUMNS, getColumn, validateColumns } from '../../config/columns.js';

/**
 * Load venues from ballparks file
 */
export async function loadVenues(dataDir: string): Promise<number> {
  const filePath = join(dataDir, 'reference', 'ballparks0.csv');

  if (!existsSync(filePath)) {
    console.log('  Ballparks file not found, skipping venues');
    console.log(`  Expected: ${filePath}`);
    return 0;
  }

  console.log('Loading venues from ballparks file...');
  const collection = getCollection<Venue>(COLLECTIONS.VENUES);
  const venues: Venue[] = [];
  let validated = false;

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;

    // Validate columns on first row
    if (!validated) {
      validateColumns(headers, BALLPARKS_COLUMNS, 'ballparks0.csv');
      validated = true;
    }

    const obj = rowToObject(row, headers);
    const venueId = getColumn(obj, BALLPARKS_COLUMNS.venueId);
    if (!venueId) continue;

    venues.push({
      venueId,
      name: getColumn(obj, BALLPARKS_COLUMNS.name),
      city: getColumn(obj, BALLPARKS_COLUMNS.city),
      state: getColumn(obj, BALLPARKS_COLUMNS.state) || undefined,
      country: 'USA',
      opened: parseDate(getColumn(obj, BALLPARKS_COLUMNS.firstGame)),
      closed: parseDate(getColumn(obj, BALLPARKS_COLUMNS.lastGame)),
    });
  }

  if (venues.length > 0) {
    await collection.insertMany(venues, { ordered: false }).catch(() => {});
  }

  console.log(`  Loaded ${venues.length} venues`);
  return venues.length;
}
