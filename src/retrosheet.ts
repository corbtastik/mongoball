/**
 * Retrosheet data download functions
 */

import { join } from 'path';
import { readdirSync } from 'fs';
import { ensureDir, downloadAndExtractZip } from './utils.js';
import type { DownloadResult } from './types.js';

const RETROSHEET_BASE_URL = 'https://www.retrosheet.org';

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
    `${RETROSHEET_BASE_URL}/gamelogs/gl${year}.zip`,
    retrosheetDir,
    'game logs'
  );
  if (!glSuccess) errors.push('game logs');

  // Regular season event files
  const eveSuccess = await downloadAndExtractZip(
    `${RETROSHEET_BASE_URL}/events/${year}eve.zip`,
    retrosheetDir,
    'event files (play-by-play)'
  );
  if (!eveSuccess) errors.push('event files');

  // Box score event files
  const boxSuccess = await downloadAndExtractZip(
    `${RETROSHEET_BASE_URL}/events/${year}box.zip`,
    retrosheetDir,
    'box score events'
  );
  if (!boxSuccess) errors.push('box score events');

  // Postseason event files
  const postSuccess = await downloadAndExtractZip(
    `${RETROSHEET_BASE_URL}/events/${year}post.zip`,
    retrosheetDir,
    'postseason events'
  );
  if (!postSuccess) errors.push('postseason events');

  // All-Star game
  const asSuccess = await downloadAndExtractZip(
    `${RETROSHEET_BASE_URL}/events/${year}as.zip`,
    retrosheetDir,
    'All-Star game'
  );
  if (!asSuccess) errors.push('All-Star game');

  // Schedule
  const schedSuccess = await downloadAndExtractZip(
    `${RETROSHEET_BASE_URL}/schedule/${year}SKED.zip`,
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

  const refDir = join(destDir, 'reference');
  ensureDir(refDir);

  const errors: string[] = [];

  // Biographical data
  const bioSuccess = await downloadAndExtractZip(
    `${RETROSHEET_BASE_URL}/downloads/biodata.zip`,
    refDir,
    'biographical data'
  );
  if (!bioSuccess) errors.push('biographical data');

  // Ejections
  const ejectSuccess = await downloadAndExtractZip(
    `${RETROSHEET_BASE_URL}/ejections.zip`,
    refDir,
    'ejections'
  );
  if (!ejectSuccess) errors.push('ejections');

  const files = readdirSync(refDir);
  console.log(`  Downloaded ${files.length} reference files`);

  return {
    success: errors.length === 0,
    files: files.map((f) => join(refDir, f)),
    errors,
  };
}
