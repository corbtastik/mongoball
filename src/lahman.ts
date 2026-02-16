/**
 * Lahman Baseball Database Downloader
 *
 * Downloads the SABR Lahman Baseball Database CSV files.
 * Source: https://sabr.org/lahman-database/
 *
 * The Lahman database contains complete batting, pitching, and fielding
 * statistics from 1871 to present, plus awards, Hall of Fame, salaries,
 * and more.
 *
 * NOTE: The SABR Box.com folder requires manual download as a zip file.
 * Visit: https://sabr.app.box.com/s/y1prhc795jk8zvmelfd3jq7tl389y6cd
 * Click the "Download" button (top right) -> "Download as .zip"
 * Extract to: data/reference/lahman/
 */

import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import AdmZip from 'adm-zip';

// SABR Box.com shared folder URL (requires manual download)
const LAHMAN_BOX_URL = 'https://sabr.app.box.com/s/y1prhc795jk8zvmelfd3jq7tl389y6cd';

// Files we want to import (Lahman-unique data not in Retrosheet)
export const LAHMAN_FILES = {
  // Reference
  people: 'People.csv',
  schools: 'Schools.csv',

  // Awards & Recognition
  hallOfFame: 'HallOfFame.csv',
  awardsPlayers: 'AwardsPlayers.csv',
  awardsManagers: 'AwardsManagers.csv',
  awardsSharePlayers: 'AwardsSharePlayers.csv',
  awardsShareManagers: 'AwardsShareManagers.csv',
  allStarFull: 'AllstarFull.csv',

  // Career data
  salaries: 'Salaries.csv',
  collegePlaying: 'CollegePlaying.csv',
  managers: 'Managers.csv',

  // Season aggregates (we may use these)
  batting: 'Batting.csv',
  pitching: 'Pitching.csv',
} as const;

/**
 * Download Lahman database CSV files
 *
 * The SABR Box.com folder requires manual download. This function will:
 * 1. Check if CSV files already exist in data/reference/lahman/
 * 2. Check if a zip file was manually downloaded to data/reference/
 * 3. If neither, print instructions for manual download
 */
export async function downloadLahman(outputDir: string): Promise<void> {
  const lahmanDir = join(outputDir, 'lahman');

  // Check if CSV files already exist
  if (existsSync(lahmanDir)) {
    const files = readdirSync(lahmanDir);
    const hasFiles = Object.values(LAHMAN_FILES).some(f => files.includes(f));
    if (hasFiles) {
      console.log('Lahman data already exists');
      console.log(`  Location: ${lahmanDir}`);
      const keyFiles = Object.values(LAHMAN_FILES);
      const present = keyFiles.filter(f => files.includes(f));
      console.log(`  Key files: ${present.length}/${keyFiles.length} present`);
      return;
    }
  }

  // Check for manually downloaded zip file in various locations
  const possibleZipPaths = [
    join(outputDir, 'lahman.zip'),
    join(outputDir, 'lahman_1871-2025_csv.zip'),
    join(outputDir, 'lahman-csv.zip'),
  ];

  let zipPath: string | null = null;
  for (const p of possibleZipPaths) {
    if (existsSync(p)) {
      zipPath = p;
      break;
    }
  }

  if (zipPath) {
    console.log('Found Lahman zip file, extracting...');
    console.log(`  Source: ${zipPath}`);

    // Create directory
    mkdirSync(lahmanDir, { recursive: true });

    // Extract zip
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    let extracted = 0;
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      // Get just the filename (ignore directory structure in zip)
      const filename = entry.entryName.split('/').pop() || entry.entryName;

      // Only extract CSV and TXT files
      if (!filename.endsWith('.csv') && !filename.endsWith('.txt')) continue;

      zip.extractEntryTo(entry, lahmanDir, false, true);
      extracted++;
    }

    console.log(`  Extracted ${extracted} files to ${lahmanDir}`);

    // List key files
    const keyFiles = Object.values(LAHMAN_FILES);
    const present = keyFiles.filter(f => existsSync(join(lahmanDir, f)));
    console.log(`  Key files: ${present.length}/${keyFiles.length} present`);
    return;
  }

  // No files found - print manual download instructions
  console.log('');
  console.log('=' .repeat(70));
  console.log('MANUAL DOWNLOAD REQUIRED: Lahman Baseball Database');
  console.log('='.repeat(70));
  console.log('');
  console.log('The SABR Lahman database requires manual download from Box.com.');
  console.log('');
  console.log('Steps:');
  console.log(`  1. Visit: ${LAHMAN_BOX_URL}`);
  console.log('  2. Click the "Download" button (top right corner)');
  console.log('  3. Select "Download as .zip"');
  console.log(`  4. Save the zip file to: ${outputDir}/`);
  console.log('  5. Re-run this command');
  console.log('');
  console.log('The zip file will be automatically extracted on the next run.');
  console.log('='.repeat(70));
  console.log('');

  // Don't throw an error, just skip Lahman
  console.log('Skipping Lahman database for now...');
}

/**
 * Check if Lahman data exists
 */
export function lahmanExists(dataDir: string): boolean {
  const lahmanDir = join(dataDir, 'reference', 'lahman');
  if (!existsSync(lahmanDir)) return false;

  // Check for at least one key file
  return existsSync(join(lahmanDir, LAHMAN_FILES.people));
}

/**
 * Get path to a Lahman CSV file
 */
export function getLahmanPath(dataDir: string, file: keyof typeof LAHMAN_FILES): string {
  return join(dataDir, 'reference', 'lahman', LAHMAN_FILES[file]);
}
