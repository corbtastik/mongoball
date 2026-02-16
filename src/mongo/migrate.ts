#!/usr/bin/env node
/**
 * MongoDB Migration CLI
 *
 * Migrates MLB data from CSV/Retrosheet files into MongoDB.
 *
 * Usage:
 *   npx tsx src/mongo/migrate.ts --years 2020-2024
 *   npx tsx src/mongo/migrate.ts --years 2023 --collections pitches,games
 *   npx tsx src/mongo/migrate.ts --fresh --years 2015-2024
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  connect,
  disconnect,
  dropAllCollections,
  createIndexes,
  getStats,
} from './connection.js';
import { loadPlayers } from './loaders/players.js';
import { loadPitches } from './loaders/pitches.js';
import { loadGames } from './loaders/games.js';
import { loadRosters } from './loaders/rosters.js';
import { loadTeams } from './loaders/teams.js';
import { loadVenues } from './loaders/venues.js';
import { loadEjections } from './loaders/ejections.js';

interface MigrateOptions {
  uri: string;
  database: string;
  dataDir: string;
  years: string;
  collections: string;
  fresh: boolean;
  indexesOnly: boolean;
  statsOnly: boolean;
}

function parseYearRange(yearStr: string): { start: number; end: number } {
  if (yearStr.includes('-')) {
    const [start, end] = yearStr.split('-').map((y) => Number.parseInt(y, 10));
    return { start, end };
  }
  const year = Number.parseInt(yearStr, 10);
  return { start: year, end: year };
}

async function runMigration(options: MigrateOptions): Promise<void> {
  const startTime = Date.now();

  // Connect to MongoDB
  await connect({
    uri: options.uri,
    database: options.database,
  });

  // Stats only mode
  if (options.statsOnly) {
    console.log('\nCollection Statistics:');
    const stats = await getStats();
    for (const [name, count] of Object.entries(stats)) {
      console.log(`  ${name}: ${count.toLocaleString()} documents`);
    }
    await disconnect();
    return;
  }

  // Indexes only mode
  if (options.indexesOnly) {
    await createIndexes();
    await disconnect();
    return;
  }

  // Fresh start - drop all collections
  if (options.fresh) {
    console.log('\nDropping existing collections...');
    await dropAllCollections();
  }

  // Parse year range
  const { start: startYear, end: endYear } = parseYearRange(options.years);
  console.log(`\nMigrating data for years ${startYear}-${endYear}`);
  console.log(`Data directory: ${options.dataDir}`);

  // Determine which collections to load
  const collectionsToLoad = options.collections
    ? new Set(options.collections.split(',').map((c) => c.trim().toLowerCase()))
    : null;

  const shouldLoad = (name: string): boolean => {
    if (!collectionsToLoad) return true;
    return collectionsToLoad.has(name);
  };

  // Load reference data (not year-specific)
  if (shouldLoad('players')) {
    await loadPlayers(options.dataDir);
  }

  if (shouldLoad('teams')) {
    await loadTeams(options.dataDir);
  }

  if (shouldLoad('venues')) {
    await loadVenues(options.dataDir);
  }

  if (shouldLoad('ejections')) {
    await loadEjections(options.dataDir, startYear, endYear);
  }

  // Load year-specific data
  if (shouldLoad('games')) {
    await loadGames(options.dataDir, startYear, endYear);
  }

  if (shouldLoad('rosters')) {
    await loadRosters(options.dataDir, startYear, endYear);
  }

  if (shouldLoad('pitches')) {
    await loadPitches(options.dataDir, startYear, endYear);
  }

  // Create indexes
  console.log('\n');
  await createIndexes();

  // Print final stats
  console.log('\nFinal Statistics:');
  const stats = await getStats();
  for (const [name, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  ${name}: ${count.toLocaleString()} documents`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nMigration completed in ${elapsed}s`);

  await disconnect();
}

// CLI
const program = new Command();

program
  .name('migrate')
  .description('Migrate MLB data to MongoDB')
  .option('--uri <uri>', 'MongoDB connection URI', 'mongodb://localhost:27017')
  .option('--database <name>', 'Database name', 'mlb')
  .option('--data-dir <path>', 'Data directory', '.')
  .option('--years <range>', 'Year or year range (e.g., 2023 or 2020-2024)', '2023')
  .option(
    '--collections <list>',
    'Comma-separated list of collections to load (default: all)'
  )
  .option('--fresh', 'Drop existing collections before loading', false)
  .option('--indexes-only', 'Only create indexes, do not load data', false)
  .option('--stats-only', 'Only show collection statistics', false)
  .addHelpText(
    'after',
    `
Examples:
  # Migrate 2023 data
  npx tsx src/mongo/migrate.ts --data-dir ./data --years 2023

  # Migrate multiple years
  npx tsx src/mongo/migrate.ts --data-dir ./data --years 2020-2024

  # Fresh migration (drop existing data)
  npx tsx src/mongo/migrate.ts --data-dir ./data --years 2023 --fresh

  # Only load pitches and games
  npx tsx src/mongo/migrate.ts --years 2023 --collections pitches,games

  # Create indexes only
  npx tsx src/mongo/migrate.ts --indexes-only

  # Show statistics
  npx tsx src/mongo/migrate.ts --stats-only

Collections:
  players      - Player biographical data (from Chadwick register)
  teams        - Team information
  venues       - Ballpark data
  ejections    - Ejection records
  games        - Game logs
  rosters      - Season rosters
  pitches      - Statcast pitch-by-pitch (2015+)
`
  )
  .action(async (opts) => {
    const options: MigrateOptions = {
      uri: opts.uri,
      database: opts.database,
      dataDir: resolve(opts.dataDir),
      years: opts.years,
      collections: opts.collections || '',
      fresh: opts.fresh,
      indexesOnly: opts.indexesOnly,
      statsOnly: opts.statsOnly,
    };

    try {
      await runMigration(options);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  });

program.parse();
