/**
 * Venues Loader
 *
 * Loads ballpark/venue data from Retrosheet ballparks file.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Venue } from '../schema.js';
import { streamCSV, parseDate } from '../parsers.js';

/**
 * Load venues from ballparks file
 */
export async function loadVenues(dataDir: string): Promise<number> {
  // Try multiple possible paths (prefer reference/ directory)
  const possiblePaths = [
    join(dataDir, 'reference', 'ballparks0.csv'),
    join(dataDir, 'ballparks0.csv'),
  ];

  let filePath: string | null = null;
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log('  Ballparks file not found, skipping venues');
    return 0;
  }

  console.log('Loading venues from ballparks file...');
  const collection = getCollection<Venue>(COLLECTIONS.VENUES);

  const venues: Venue[] = [];

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;

    // Build row object
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] || '';
    }

    const venueId = obj['PARKID'] || obj['parkid'] || '';
    if (!venueId) continue;

    // Parse dates (format varies)
    const startDate = obj['START'] || obj['start'];
    const endDate = obj['END'] || obj['end'];

    venues.push({
      venueId,
      name: obj['NAME'] || obj['name'] || '',
      city: obj['CITY'] || obj['city'] || '',
      state: obj['STATE'] || obj['state'] || undefined,
      country: obj['COUNTRY'] || obj['country'] || 'USA',
      opened: startDate ? parseDate(startDate) : undefined,
      closed: endDate ? parseDate(endDate) : undefined,
    });
  }

  if (venues.length > 0) {
    await collection.insertMany(venues, { ordered: false }).catch(() => {});
  }

  console.log(`  Loaded ${venues.length} venues`);
  return venues.length;
}
