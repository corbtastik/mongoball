#!/usr/bin/env node
/**
 * Download complete MLB season data from Retrosheet and Baseball Savant.
 *
 * Usage:
 *   npx tsx src/download-season.ts 2023
 *   npx tsx src/download-season.ts 2022 --no-statcast
 *   npx tsx src/download-season.ts 2023 --statcast-only
 *
 * Data Structure:
 *   data/
 *   ├── reference/           # Shared reference data
 *   │   ├── chadwick_register.csv
 *   │   ├── biofile0.csv
 *   │   └── ...
 *   └── seasons/             # Per-season data
 *       ├── 2023/
 *       │   ├── retrosheet/
 *       │   └── statcast/
 *       └── ...
 */

import { Command } from 'commander';
import { resolve, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { downloadRetrosheet, downloadReferenceData } from './retrosheet.js';
import { downloadStatcast } from './statcast.js';
import { downloadCrosswalk } from './crosswalk.js';
import { downloadLahman } from './lahman.js';
import type { DownloadOptions } from './types.js';

// Default data directory relative to project root
const DEFAULT_DATA_DIR = './data';

const program = new Command();

program
  .name('download-season')
  .description('Download MLB season data from Retrosheet and Baseball Savant')
  .argument('[years...]', 'Season year(s) to download')
  .option('--no-statcast', 'Skip Statcast download')
  .option('--statcast-only', 'Only download Statcast')
  .option('--no-retrosheet', 'Skip Retrosheet download')
  .option('--crosswalk-only', 'Only download crosswalk')
  .option('--include-reference', 'Include reference data (biofile, ejections)')
  .option('--lahman', 'Include Lahman Baseball Database (historical stats, awards, HOF)')
  .option('--lahman-only', 'Only download Lahman database')
  .option('-o, --output-dir <dir>', 'Output directory', DEFAULT_DATA_DIR)
  .addHelpText(
    'after',
    `
Output Structure:
  data/
  ├── reference/              # Shared reference data
  │   ├── chadwick_register.csv
  │   ├── biofile0.csv
  │   └── lahman/             # Lahman Baseball Database
  │       ├── People.csv
  │       ├── HallOfFame.csv
  │       ├── Salaries.csv
  │       └── ...
  └── seasons/                # Per-season data
      └── {year}/
          ├── retrosheet/
          └── statcast/

Examples:
  npx tsx src/download-season.ts 2023              # Download 2023 to ./data
  npx tsx src/download-season.ts 2022 2023 2024    # Download multiple seasons
  npx tsx src/download-season.ts 2023 --no-statcast    # Skip Statcast data
  npx tsx src/download-season.ts 2023 --statcast-only  # Only Statcast data
  npx tsx src/download-season.ts --crosswalk-only      # Only download crosswalk
  npx tsx src/download-season.ts --lahman-only         # Only Lahman database
  npx tsx src/download-season.ts 2023 --lahman         # Season + Lahman data
  npx tsx src/download-season.ts 2023 -o /path/to/data # Custom output directory

Environment Variables:
  DATA_DIR    Override default data directory (default: ./data)
`
  )
  .action(async (years: string[], options) => {
    // Allow DATA_DIR env var to override default
    const baseDir = process.env.DATA_DIR || options.outputDir;

    const opts: DownloadOptions = {
      years: years.map((y) => parseInt(y, 10)).filter((y) => !isNaN(y)),
      outputDir: resolve(baseDir),
      noStatcast: !options.statcast,
      statcastOnly: options.statcastOnly || false,
      noRetrosheet: !options.retrosheet,
      crosswalkOnly: options.crosswalkOnly || false,
      includeReference: options.includeReference || false,
      lahman: options.lahman || false,
      lahmanOnly: options.lahmanOnly || false,
    };

    // Validate
    if (opts.years.length === 0 && !opts.crosswalkOnly && !opts.lahmanOnly) {
      console.error('Error: Please specify at least one year, --crosswalk-only, or --lahman-only');
      process.exit(1);
    }

    // Create directory structure
    const referenceDir = join(opts.outputDir, 'reference');
    const seasonsDir = join(opts.outputDir, 'seasons');

    console.log(`Data directory: ${opts.outputDir}`);
    console.log(`  Reference: ${referenceDir}`);
    console.log(`  Seasons:   ${seasonsDir}`);

    // Ensure directories exist
    mkdirSync(referenceDir, { recursive: true });
    mkdirSync(seasonsDir, { recursive: true });

    // Download crosswalk to reference directory (always, unless statcast-only)
    if (!opts.statcastOnly) {
      await downloadCrosswalk(referenceDir);
    }

    // Download Lahman database if requested
    if (opts.lahman || opts.lahmanOnly) {
      await downloadLahman(referenceDir);
    }

    if (opts.crosswalkOnly || opts.lahmanOnly) {
      console.log('\nDone!');
      return;
    }

    // Download reference data if requested
    if (opts.includeReference) {
      await downloadReferenceData(referenceDir);
    }

    // Process each year
    for (const year of opts.years) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing ${year} season`);
      console.log('='.repeat(60));

      const yearDir = join(seasonsDir, String(year));
      mkdirSync(yearDir, { recursive: true });

      // Retrosheet
      if (!opts.noRetrosheet && !opts.statcastOnly) {
        await downloadRetrosheet(year, yearDir);
      }

      // Statcast
      if (!opts.noStatcast) {
        await downloadStatcast(year, yearDir);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Download complete!');
    console.log('='.repeat(60));

    // Summary
    console.log(`\nFiles saved to: ${opts.outputDir}`);
    console.log(`  Reference data: ${referenceDir}`);
    for (const year of opts.years) {
      console.log(`  ${year} season:   ${join(seasonsDir, String(year))}`);
    }

    if (!opts.statcastOnly) {
      console.log('\nTo link Retrosheet ↔ Statcast, use reference/chadwick_register.csv:');
      console.log("  - key_retro  = Retrosheet ID (e.g., 'stris002')");
      console.log("  - key_mlbam  = Statcast/MLBAM ID (e.g., '675911')");
    }
  });

program.parse();
