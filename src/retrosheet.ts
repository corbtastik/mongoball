/**
 * Retrosheet data download functions
 *
 * Downloads season and reference data from Retrosheet.org.
 * Source configuration: src/config/sources.ts
 */

import { join } from 'path';
import { readdirSync } from 'fs';
import { ensureDir, downloadAndExtractZip } from './utils.js';
import { RETROSHEET } from './config/sources.js';
import type { DownloadResult } from './types.js';

/**
 * Download all Retrosheet data for a season
 */
export async function downloadRetrosheet(
  year: number,
  destDir: string
): Promise<DownloadResult> {
  console.log(`\n[Retrosheet] Downloading ${year} data...`);

  const retrosheetDir = join(destDir, 'retrosheet');
  ensureDir(retrosheetDir);

  const errors: string[] = [];

  // Game logs
  const glSuccess = await downloadAndExtractZip(
    RETROSHEET.season.gameLogs(year),
    retrosheetDir,
    'game logs'
  );
  if (!glSuccess) errors.push('game logs');

  // Regular season event files
  const eveSuccess = await downloadAndExtractZip(
    RETROSHEET.season.events(year),
    retrosheetDir,
    'event files (play-by-play)'
  );
  if (!eveSuccess) errors.push('event files');

  // Box score event files
  const boxSuccess = await downloadAndExtractZip(
    RETROSHEET.season.boxScores(year),
    retrosheetDir,
    'box score events'
  );
  if (!boxSuccess) errors.push('box score events');

  // Postseason event files
  const postSuccess = await downloadAndExtractZip(
    RETROSHEET.season.postseason(year),
    retrosheetDir,
    'postseason events'
  );
  if (!postSuccess) errors.push('postseason events');

  // All-Star game
  const asSuccess = await downloadAndExtractZip(
    RETROSHEET.season.allStar(year),
    retrosheetDir,
    'All-Star game'
  );
  if (!asSuccess) errors.push('All-Star game');

  // Schedule
  const schedSuccess = await downloadAndExtractZip(
    RETROSHEET.season.schedule(year),
    retrosheetDir,
    'schedule'
  );
  if (!schedSuccess) errors.push('schedule');

  // Count downloaded files
  const files = readdirSync(retrosheetDir);
  console.log(`  Downloaded ${files.length} Retrosheet files`);

  return {
    success: errors.length === 0,
    files: files.map((f) => join(retrosheetDir, f)),
    errors,
  };
}

/**
 * Download Retrosheet reference data (biofile, ballparks, etc.)
 */
export async function downloadReferenceData(
  destDir: string
): Promise<DownloadResult> {
  console.log(`\n[Reference] Downloading biographical and reference data...`);

  // destDir is already the reference directory (e.g., data/reference)
  ensureDir(destDir);

  const errors: string[] = [];

  // Biographical data (ballparks, players, coaches, etc.)
  const bioSuccess = await downloadAndExtractZip(
    RETROSHEET.reference.biodata,
    destDir,
    'biographical data'
  );
  if (!bioSuccess) errors.push('biographical data');

  // Ejections
  const ejectSuccess = await downloadAndExtractZip(
    RETROSHEET.reference.ejections,
    destDir,
    'ejections'
  );
  if (!ejectSuccess) errors.push('ejections');

  const files = readdirSync(destDir);
  console.log(`  Downloaded ${files.length} reference files`);

  return {
    success: errors.length === 0,
    files: files.map((f) => join(destDir, f)),
    errors,
  };
}
