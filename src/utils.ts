/**
 * Utility functions for downloading and extracting files
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import AdmZip from 'adm-zip';

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Download a file from URL to destination path
 */
export async function downloadFile(
  url: string,
  destPath: string,
  description?: string
): Promise<boolean> {
  if (description) {
    process.stdout.write(`  Downloading ${description}...`);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const fileStream = createWriteStream(destPath);
    await finished(Readable.fromWeb(response.body as any).pipe(fileStream));

    if (description) {
      console.log(' done');
    }
    return true;
  } catch (error) {
    if (description) {
      console.log(' failed');
    }
    console.error(`    Warning: Failed to download ${url}: ${error}`);
    return false;
  }
}

/**
 * Download a zip file and extract to destination directory
 */
export async function downloadAndExtractZip(
  url: string,
  destDir: string,
  description?: string
): Promise<boolean> {
  if (description) {
    process.stdout.write(`  Downloading ${description}...`);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(buffer);
    zip.extractAllTo(destDir, true);

    if (description) {
      console.log(' done');
    }
    return true;
  } catch (error) {
    if (description) {
      console.log(' failed');
    }
    console.error(`    Warning: Failed to download/extract ${url}: ${error}`);
    return false;
  }
}

/**
 * Format file size in human-readable form
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Get file size if file exists
 */
export function getFileSize(filePath: string): number | null {
  try {
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
