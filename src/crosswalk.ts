/**
 * Chadwick Bureau player ID crosswalk download
 *
 * Downloads and combines the 16-part player register from GitHub.
 * Source configuration: src/config/sources.ts
 */

import { join } from 'path';
import { existsSync, createWriteStream } from 'fs';
import { ensureDir, formatSize, getFileSize } from './utils.js';
import { CHADWICK } from './config/sources.js';
import type { DownloadResult } from './types.js';

/**
 * Download Chadwick Bureau player ID crosswalk
 */
export async function downloadCrosswalk(destDir: string): Promise<DownloadResult> {
  const crosswalkFile = join(destDir, CHADWICK.outputFile);

  if (existsSync(crosswalkFile)) {
    const size = getFileSize(crosswalkFile);
    console.log(`\n[Crosswalk] Already exists: ${CHADWICK.outputFile} (${formatSize(size || 0)})`);
    return { success: true, files: [crosswalkFile], errors: [] };
  }

  console.log('\n[Crosswalk] Downloading Chadwick Bureau player register...');
  ensureDir(destDir);

  const errors: string[] = [];
  let totalLines = 0;

  // Download all 16 parts and combine
  const writeStream = createWriteStream(crosswalkFile);

  for (let i = 0; i < CHADWICK.files.length; i++) {
    const url = CHADWICK.files[i];
    const partId = url.split('people-')[1]?.replace('.csv', '') || String(i);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      writeStream.write(text);
      totalLines += text.split('\n').length;
      process.stdout.write(`\r  Downloaded part ${partId}...`);
    } catch (error) {
      errors.push(`people-${partId}.csv: ${error}`);
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
