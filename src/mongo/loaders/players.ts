/**
 * Players Loader
 *
 * Loads player data from Chadwick register and Retrosheet biofile.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { Collection } from 'mongodb';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Player } from '../schema.js';
import { streamCSV, parseDate, parseInt, parseSide, batch } from '../parsers.js';

const BATCH_SIZE = 1000;

interface CrosswalkRow {
  key_retro: string;
  key_mlbam: string;
  key_bbref: string;
  key_fangraphs: string;
  name_last: string;
  name_first: string;
  name_given: string;
  birth_year: string;
  birth_month: string;
  birth_day: string;
  birth_city: string;
  birth_state: string;
  birth_country: string;
  death_year: string;
  death_month: string;
  death_day: string;
  pro_played_first: string;
  pro_played_last: string;
  mlb_played_first: string;
  mlb_played_last: string;
}

interface BiofileRow {
  id: string;
  last: string;
  first: string;
  nickname: string;
  birthdate: string;
  birthcity: string;
  birthstate: string;
  birthcountry: string;
  deathdate: string;
  deathcity: string;
  deathstate: string;
  deathcountry: string;
  bats: string;
  throws: string;
  height: string;
  weight: string;
  debut: string;
  finalgame: string;
  hof: string;
}

function buildDateFromParts(year: string, month: string, day: string): Date | undefined {
  if (!year || year === '') return undefined;
  const y = Number.parseInt(year, 10);
  const m = Number.parseInt(month || '1', 10);
  const d = Number.parseInt(day || '1', 10);
  if (Number.isNaN(y)) return undefined;
  return new Date(y, m - 1, d);
}

function buildSeasonsActive(firstYear: string, lastYear: string): number[] {
  const first = Number.parseInt(firstYear, 10);
  const last = Number.parseInt(lastYear, 10);
  if (Number.isNaN(first) || Number.isNaN(last)) return [];

  const seasons: number[] = [];
  for (let y = first; y <= last; y++) {
    seasons.push(y);
  }
  return seasons;
}

/**
 * Load players from Chadwick crosswalk
 */
export async function loadPlayers(dataDir: string): Promise<number> {
  // Reference data lives in data/reference/
  const crosswalkPath = join(dataDir, 'reference', 'chadwick_register.csv');
  const biofilePath = join(dataDir, 'reference', 'biofile0.csv');

  if (!existsSync(crosswalkPath)) {
    console.log('  Chadwick crosswalk not found, skipping players');
    return 0;
  }

  console.log('Loading players from Chadwick register...');
  const collection = getCollection<Player>(COLLECTIONS.PLAYERS);

  // Load biofile for additional data
  const bioData = new Map<string, BiofileRow>();
  if (existsSync(biofilePath)) {
    console.log('  Loading biofile for additional data...');
    for await (const { row, headers } of streamCSV(biofilePath)) {
      if (!headers) continue;
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = row[i] || '';
      }
      const bio = obj as unknown as BiofileRow;
      if (bio.id) {
        bioData.set(bio.id, bio);
      }
    }
    console.log(`  Loaded ${bioData.size} biofile entries`);
  }

  // Process crosswalk
  const players: Player[] = [];
  let count = 0;
  let skipped = 0;

  for await (const { row, headers } of streamCSV(crosswalkPath)) {
    if (!headers) continue;

    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] || '';
    }
    const xw = obj as unknown as CrosswalkRow;

    // Skip entries without Retrosheet ID or header rows
    // (Chadwick file is concatenated from 16 files, each with headers)
    if (!xw.key_retro || xw.key_retro === 'key_retro') {
      skipped++;
      continue;
    }

    // Get biofile data if available
    const bio = bioData.get(xw.key_retro);

    const player: Player = {
      playerId: xw.key_retro,
      mlbamId: parseInt(xw.key_mlbam),
      bbrefId: xw.key_bbref || undefined,
      fangraphsId: parseInt(xw.key_fangraphs),
      name: {
        first: xw.name_first || '',
        last: xw.name_last || '',
        given: xw.name_given || undefined,
      },
      birth: {
        date: buildDateFromParts(xw.birth_year, xw.birth_month, xw.birth_day),
        city: xw.birth_city || undefined,
        state: xw.birth_state || undefined,
        country: xw.birth_country || undefined,
      },
      death: {
        date: buildDateFromParts(xw.death_year, xw.death_month, xw.death_day),
      },
      physical: bio
        ? {
            bats: parseSide(bio.bats),
            throws: parseSide(bio.throws),
            height: parseInt(bio.height),
            weight: parseInt(bio.weight),
          }
        : undefined,
      mlbDebut: xw.mlb_played_first
        ? new Date(Number.parseInt(xw.mlb_played_first, 10), 0, 1)
        : undefined,
      finalGame: bio?.finalgame ? parseDate(bio.finalgame) : undefined,
      seasonsActive: buildSeasonsActive(xw.mlb_played_first, xw.mlb_played_last),
      isHallOfFame: bio?.hof === 'HOF',
    };

    players.push(player);
    count++;

    // Batch insert
    if (players.length >= BATCH_SIZE) {
      await collection.insertMany(players, { ordered: false }).catch(() => {});
      process.stdout.write(`\r  Loaded ${count.toLocaleString()} players`);
      players.length = 0;
    }
  }

  // Insert remaining
  if (players.length > 0) {
    await collection.insertMany(players, { ordered: false }).catch(() => {});
  }

  console.log(`\r  Loaded ${count.toLocaleString()} players (skipped ${skipped.toLocaleString()} without Retrosheet ID)`);
  return count;
}
