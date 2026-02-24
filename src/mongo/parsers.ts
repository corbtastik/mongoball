/**
 * Data Parsers
 *
 * Utilities for parsing CSV and Retrosheet data formats.
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';

/**
 * Parse a CSV line handling quoted fields
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Stream-read a CSV file line by line
 */
export async function* streamCSV(
  filePath: string,
  hasHeader = true
): AsyncGenerator<{ row: string[]; headers?: string[] }> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let headers: string[] | undefined;
  let isFirst = true;

  for await (const line of rl) {
    if (!line.trim()) continue;

    const row = parseCSVLine(line);

    if (isFirst && hasHeader) {
      headers = row;
      isFirst = false;
      continue;
    }

    yield { row, headers };
  }
}

/**
 * Convert a CSV row array to an object using headers
 */
export function rowToObject(row: string[], headers: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] || '';
  }
  return obj;
}

/**
 * Read a CSV file into an array of objects
 */
export async function readCSV<T extends Record<string, string>>(
  filePath: string
): Promise<T[]> {
  const results: T[] = [];
  let headers: string[] = [];

  for await (const { row, headers: h } of streamCSV(filePath)) {
    if (h && headers.length === 0) {
      headers = h;
    }
    results.push(rowToObject(row, headers) as T);
  }

  return results;
}

/**
 * Parse a date string to Date object
 */
export function parseDate(dateStr: string): Date | undefined {
  if (!dateStr || dateStr === '') return undefined;

  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Handle YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  // Handle MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
  }

  return undefined;
}

/**
 * Parse an integer, returning undefined for invalid values
 */
export function parseInt(value: string): number | undefined {
  if (!value || value === '') return undefined;
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * Parse a float, returning undefined for invalid values
 */
export function parseFloat(value: string): number | undefined {
  if (!value || value === '') return undefined;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * Extract season from game ID (e.g., "TEX202311010" -> 2023)
 */
export function extractSeasonFromGameId(gameId: string): number {
  const match = gameId.match(/[A-Z]{3}(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Parse bats/throws value
 */
export function parseSide(value: string): 'R' | 'L' | 'B' {
  const upper = value.toUpperCase();
  if (upper === 'L') return 'L';
  if (upper === 'B' || upper === 'S') return 'B';
  return 'R';
}

/**
 * Batch array into chunks
 */
export function batch<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}
