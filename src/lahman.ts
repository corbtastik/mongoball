/**
 * Lahman Baseball Database Downloader
 *
 * Downloads the Lahman Baseball Database CSV files from GitHub.
 * Original source: https://sabr.org/lahman-database/
 * Hosted at: https://github.com/corbtastik/lahman-baseball-db
 *
 * Source configuration: src/config/sources.ts
 */

import { existsSync, mkdirSync, createWriteStream, readdirSync } from 'fs';
import { join } from 'path';
import { LAHMAN } from './config/sources.js';


/**
 * Download a single file from GitHub
 */
async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const fileStream = createWriteStream(destPath);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
    }

    fileStream.end();
    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    return true;
  } catch (error) {
    console.error(`    Failed to download ${url}: ${error}`);
    return false;
  }
}

/**
 * Download Lahman database CSV files from GitHub
 */
export async function downloadLahman(outputDir: string): Promise<void> {
  const lahmanDir = join(outputDir, 'lahman');

  // Check if CSV files already exist
  if (existsSync(lahmanDir)) {
    const files = readdirSync(lahmanDir);
    const keyFiles = Object.values(LAHMAN.files);
    const present = keyFiles.filter((f) => files.includes(f));

    if (present.length === keyFiles.length) {
      console.log('\n[Lahman] Data already exists');
      console.log(`  Location: ${lahmanDir}`);
      console.log(`  Files: ${present.length}/${keyFiles.length} present`);
      return;
    }
  }

  console.log('\n[Lahman] Downloading from GitHub...');
  console.log(`  Source: ${LAHMAN.website}`);

  // Create directory
  mkdirSync(lahmanDir, { recursive: true });

  const files = Object.entries(LAHMAN.files);
  let downloaded = 0;
  let failed = 0;

  for (const [key, filename] of files) {
    const url = `${LAHMAN.baseUrl}/${filename}`;
    const destPath = join(lahmanDir, filename);

    process.stdout.write(`  Downloading ${filename}...`);

    if (await downloadFile(url, destPath)) {
      downloaded++;
      console.log(' done');
    } else {
      failed++;
      console.log(' FAILED');
    }
  }

  console.log(`  Downloaded ${downloaded}/${files.length} files`);
  if (failed > 0) {
    console.log(`  Warning: ${failed} files failed to download`);
  }
}

