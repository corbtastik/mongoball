/**
 * Chadwick Bureau player ID crosswalk download
 */

import { join } from 'path';
import { existsSync, createWriteStream } from 'fs';
import { ensureDir, formatSize, getFileSize } from './utils.js';
import type { DownloadResult } from './types.js';

const CHADWICK_BASE_URL =
  'https://raw.githubusercontent.com/chadwickbureau/register/master/data';

/**
 * Download Chadwick Bureau player ID crosswalk
 */
export async function downloadCrosswalk(destDir: string): Promise<DownloadResult> {
  const crosswalkFile = join(destDir, 'chadwick_register.csv');

  if (existsSync(crosswalkFile)) {
    const size = getFileSize(crosswalkFile);
    console.log(`\n[Crosswalk] Already exists: chadwick_register.csv (${formatSize(size || 0)})`);
    return { success: true, files: [crosswalkFile], errors: [] };
  }

  console.log('\n[Crosswalk] Downloading Chadwick Bureau player register...');
  ensureDir(destDir);

  const errors: string[] = [];
  const parts = '0123456789abcdef'.split('');
  let totalLines = 0;

  // Download all 16 parts and combine
  const writeStream = createWriteStream(crosswalkFile);

  for (const part of parts) {
    const url = `${CHADWICK_BASE_URL}/people-${part}.csv`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      writeStream.write(text);
      totalLines += text.split('\n').length;
      process.stdout.write(`\r  Downloaded part ${part}...`);
    } catch (error) {
      errors.push(`people-${part}.csv: ${error}`);
    }
  }

  writeStream.end();
  console.log('');

  // Wait for write to complete
  await new Promise<void>((resolve) => writeStream.on('finish', resolve));

  const fileSize = getFileSize(crosswalkFile);
  console.log(
    `  Downloaded ${totalLines.toLocaleString()} players (${formatSize(fileSize || 0)})`
  );

  return {
    success: errors.length === 0,
    files: [crosswalkFile],
    errors,
  };
}
