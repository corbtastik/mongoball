#!/usr/bin/env node
/**
 * Download complete MLB season data from Retrosheet and Baseball Savant.
 *
 * Usage:
 *   npx tsx src/download-season.ts 2023
 *   npx tsx src/download-season.ts 2022 --no-statcast
 *   npx tsx src/download-season.ts 2023 --statcast-only
 *
 * Data Sources:
 *   - Retrosheet: Game logs, event files, box scores, schedules, rosters
 *   - Baseball Savant: Pitch-by-pitch Statcast data (2015+)
 *   - Chadwick Bureau: Player ID crosswalk
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { downloadRetrosheet, downloadReferenceData } from './retrosheet.js';
import { downloadStatcast } from './statcast.js';
import { downloadCrosswalk } from './crosswalk.js';
import type { DownloadOptions } from './types.js';

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
  .option('-o, --output-dir <dir>', 'Output directory', '.')
  .addHelpText(
    'after',
    `
Examples:
  npx tsx src/download-season.ts 2023              # Download everything for 2023
  npx tsx src/download-season.ts 2022 2023 2024    # Download multiple seasons
  npx tsx src/download-season.ts 2023 --no-statcast    # Skip Statcast data
  npx tsx src/download-season.ts 2023 --statcast-only  # Only Statcast data
  npx tsx src/download-season.ts --crosswalk-only      # Only download crosswalk
`
  )
  .action(async (years: string[], options) => {
    const opts: DownloadOptions = {
      years: years.map((y) => parseInt(y, 10)).filter((y) => !isNaN(y)),
      outputDir: resolve(options.outputDir),
      noStatcast: !options.statcast,
      statcastOnly: options.statcastOnly || false,
      noRetrosheet: !options.retrosheet,
      crosswalkOnly: options.crosswalkOnly || false,
      includeReference: options.includeReference || false,
    };

    // Validate
    if (opts.years.length === 0 && !opts.crosswalkOnly) {
      console.error('Error: Please specify at least one year or use --crosswalk-only');
      process.exit(1);
    }

    console.log(`Output directory: ${opts.outputDir}`);

    // Ensure output directory exists
    if (!existsSync(opts.outputDir)) {
      mkdirSync(opts.outputDir, { recursive: true });
    }

    // Download crosswalk (always, unless statcast-only)
    if (!opts.statcastOnly) {
      await downloadCrosswalk(opts.outputDir);
    }

    if (opts.crosswalkOnly) {
      console.log('\nDone!');
      return;
    }

    // Download reference data if requested
    if (opts.includeReference) {
      await downloadReferenceData(opts.outputDir);
    }

    // Process each year
    for (const year of opts.years) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing ${year} season`);
      console.log('='.repeat(60));

      const yearDir = resolve(opts.outputDir, String(year));
      if (!existsSync(yearDir)) {
        mkdirSync(yearDir, { recursive: true });
      }

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
    if (!opts.statcastOnly) {
      console.log('\nTo link Retrosheet ↔ Statcast, use chadwick_register.csv:');
      console.log("  - key_retro  = Retrosheet ID (e.g., 'stris002')");
      console.log("  - key_mlbam  = Statcast/MLBAM ID (e.g., '675911')");
    }
  });

program.parse();
