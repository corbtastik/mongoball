/**
 * Baseball Savant Statcast data download functions
 *
 * Uses true end-to-end streaming to avoid memory issues with large datasets.
 * Response bodies are streamed directly to disk without buffering.
 *
 * Source configuration: src/config/sources.ts
 */

import { join } from 'path';
import { createWriteStream, writeFileSync, WriteStream } from 'fs';
import { Readable } from 'stream';
import { ensureDir, formatSize, getFileSize, sleep, formatDate, addDays } from './utils.js';
import { STATCAST } from './config/sources.js';
import { SEASON_DATES } from './types.js';
import type { DownloadResult } from './types.js';

// Reduced chunk size to minimize memory per request
const CHUNK_DAYS = 3;

interface StatcastQueryParams {
  startDate: string;
  endDate: string;
  gameType?: 'R' | 'PO' | 'A'; // Regular, Postseason, All-Star
}

/**
 * Build Baseball Savant query URL
 */
function buildStatcastUrl(params: StatcastQueryParams): string {
  const searchParams = new URLSearchParams({
    all: 'true',
    hfPT: '',
    hfAB: '',
    hfGT: params.gameType || 'R',
    hfPR: '',
    hfZ: '',
    stadium: '',
    hfBBL: '',
    hfNewZones: '',
    hfPull: '',
    hfC: '',
    hfSea: '',
    hfSit: '',
    player_type: 'pitcher',
    hfOuts: '',
    opponent: '',
    pitcher_throws: '',
    batter_stands: '',
    hfSA: '',
    game_date_gt: params.startDate,
    game_date_lt: params.endDate,
    hfInfield: '',
    team: '',
    position: '',
    hfOutfield: '',
    hfRO: '',
    home_road: '',
    hfFlag: '',
    hfBBT: '',
    metric_1: '',
    hfInn: '',
    min_pitches: '0',
    min_results: '0',
    group_by: 'name',
    sort_col: 'pitches',
    player_event_sort: 'api_p_release_speed',
    sort_order: 'desc',
    min_pas: '0',
    type: 'details',
  });

  return `${STATCAST.searchUrl}?${searchParams.toString()}`;
}

/**
 * Generate date chunks for a range
 */
function* generateDateChunks(
  startDate: string,
  endDate: string,
  chunkDays: number
): Generator<{ start: string; end: string }> {
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const chunkEnd = new Date(
      Math.min(addDays(current, chunkDays - 1).getTime(), end.getTime())
    );

    yield {
      start: formatDate(current),
      end: formatDate(chunkEnd),
    };

    current = addDays(chunkEnd, 1);
  }
}

/**
 * Streaming CSV writer that handles headers and counts rows
 * Uses line-by-line processing to minimize memory usage
 */
class StreamingStatcastWriter {
  private writeStream: WriteStream;
  private headerWritten = false;
  private expectedHeader: string | null = null;
  private totalRows = 0;
  private partialLine = '';

  constructor(outputPath: string) {
    this.writeStream = createWriteStream(outputPath, { highWaterMark: 64 * 1024 });
  }

  /**
   * Process a chunk of data from the response stream
   * Handles partial lines across chunk boundaries
   */
  processChunk(chunk: string): void {
    // Combine with any partial line from previous chunk
    const data = this.partialLine + chunk;
    const lines = data.split('\n');

    // Last element might be partial (no trailing newline)
    this.partialLine = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      // First non-empty line is the header
      if (!this.headerWritten) {
        this.expectedHeader = line;
        this.writeStream.write(line + '\n');
        this.headerWritten = true;
        continue;
      }

      // Skip duplicate headers from subsequent chunks
      if (line === this.expectedHeader) {
        continue;
      }

      // Write data line
      this.writeStream.write(line + '\n');
      this.totalRows++;
    }
  }

  /**
   * Flush any remaining partial line
   */
  flush(): void {
    if (this.partialLine.trim() && this.partialLine !== this.expectedHeader) {
      this.writeStream.write(this.partialLine + '\n');
      this.totalRows++;
    }
    this.partialLine = '';
  }

  /**
   * Close the stream and return total rows written
   */
  async close(): Promise<number> {
    this.flush();
    return new Promise((resolve, reject) => {
      this.writeStream.end((err: Error | null) => {
        if (err) reject(err);
        else resolve(this.totalRows);
      });
    });
  }

  get rowCount(): number {
    return this.totalRows;
  }

  get hasHeader(): boolean {
    return this.headerWritten;
  }
}

/**
 * Stream a fetch response directly to the writer
 * This processes data in small chunks without loading entire response into memory
 */
async function streamResponseToWriter(
  response: Response,
  writer: StreamingStatcastWriter
): Promise<number> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let rowsBefore = writer.rowCount;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk to string and process
      const text = decoder.decode(value, { stream: true });
      writer.processChunk(text);
    }

    // Final decode to flush any remaining bytes
    const finalText = decoder.decode();
    if (finalText) {
      writer.processChunk(finalText);
    }
  } finally {
    reader.releaseLock();
  }

  return writer.rowCount - rowsBefore;
}

/**
 * Fetch and stream Statcast data for a date range
 */
async function fetchAndStreamChunk(
  startDate: string,
  endDate: string,
  gameType: 'R' | 'PO',
  writer: StreamingStatcastWriter
): Promise<number> {
  const url = buildStatcastUrl({ startDate, endDate, gameType });

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; retrosheet-downloader/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await streamResponseToWriter(response, writer);
}

/**
 * Download Statcast data for a season using true end-to-end streaming
 *
 * This implementation streams response bodies directly to disk without
 * buffering entire responses in memory, avoiding OOM errors.
 */
export async function downloadStatcast(
  year: number,
  destDir: string
): Promise<DownloadResult> {
  console.log(`\n[Statcast] Downloading ${year} data...`);

  if (year < STATCAST.firstYear) {
    console.log(`  Skipping: Statcast data only available ${STATCAST.firstYear}+`);
    return { success: true, files: [], errors: [] };
  }

  const statcastDir = join(destDir, 'statcast');
  ensureDir(statcastDir);

  const seasonDates = SEASON_DATES[year];
  if (!seasonDates) {
    console.log(`  Warning: Season dates not defined for ${year}, using defaults`);
  }

  const regularStart = seasonDates?.regular.start || `${year}-03-28`;
  const regularEnd = seasonDates?.regular.end || `${year}-10-05`;
  const postStart = seasonDates?.postseason.start || `${year}-10-01`;
  const postEnd = seasonDates?.postseason.end || `${year}-11-05`;

  const outputFile = join(statcastDir, `${year}_statcast.csv`);
  const writer = new StreamingStatcastWriter(outputFile);
  const errors: string[] = [];

  // Download regular season
  console.log(`  Downloading regular season (${regularStart} to ${regularEnd})...`);
  const regularChunks = [...generateDateChunks(regularStart, regularEnd, CHUNK_DAYS)];
  let completed = 0;
  let regularCount = 0;

  for (const chunk of regularChunks) {
    try {
      const rowsWritten = await fetchAndStreamChunk(chunk.start, chunk.end, 'R', writer);
      regularCount += rowsWritten;
      completed++;
      process.stdout.write(
        `\r    Progress: ${completed}/${regularChunks.length} chunks (${writer.rowCount.toLocaleString()} pitches)`
      );
      // Rate limiting to avoid overwhelming the API
      await sleep(500);
    } catch (error) {
      errors.push(`Regular ${chunk.start}-${chunk.end}: ${error}`);
    }
  }
  console.log(`\n    Regular season: ${regularCount.toLocaleString()} pitches`);

  // Download postseason
  console.log(`  Downloading postseason (${postStart} to ${postEnd})...`);
  const postChunks = [...generateDateChunks(postStart, postEnd, CHUNK_DAYS)];
  completed = 0;
  let postCount = 0;

  for (const chunk of postChunks) {
    try {
      const rowsWritten = await fetchAndStreamChunk(chunk.start, chunk.end, 'PO', writer);
      postCount += rowsWritten;
      completed++;
      process.stdout.write(`\r    Progress: ${completed}/${postChunks.length} chunks`);
      await sleep(500);
    } catch (error) {
      errors.push(`Postseason ${chunk.start}-${chunk.end}: ${error}`);
    }
  }
  console.log(`\n    Postseason: ${postCount.toLocaleString()} pitches`);

  // Close the stream
  const totalRows = await writer.close();

  const fileSize = getFileSize(outputFile);
  console.log(
    `  Done! ${totalRows.toLocaleString()} pitches (${formatSize(fileSize || 0)})`
  );

  return {
    success: errors.length === 0,
    files: [outputFile],
    errors,
  };
}

/**
 * Download Statcast batting leaderboards for a season
 */
export async function downloadBattingLeaderboards(
  year: number,
  destDir: string
): Promise<DownloadResult> {
  console.log(`\n[Statcast] Downloading ${year} batting leaderboards...`);

  if (year < STATCAST.firstYear) {
    console.log(`  Skipping: Statcast data only available ${STATCAST.firstYear}+`);
    return { success: true, files: [], errors: [] };
  }

  const leaderboardDir = join(destDir, 'statcast', 'leaderboards');
  ensureDir(leaderboardDir);

  const errors: string[] = [];
  const downloadedFiles: string[] = [];

  const leaderboards = [
    { key: 'batTracking', name: 'Bat Tracking' },
    { key: 'expectedStats', name: 'Expected Stats' },
    { key: 'exitVeloBarrels', name: 'Exit Velo & Barrels' },
    { key: 'battedBallProfile', name: 'Batted Ball Profile' },
    { key: 'sprintSpeed', name: 'Sprint Speed' },
    { key: 'runValue', name: 'Batting Run Value' },
  ] as const;

  for (const { key, name } of leaderboards) {
    const url = STATCAST.leaderboards.batting[key](year);
    const filename = STATCAST.leaderboardFiles[key];
    const outputPath = join(leaderboardDir, `${year}_${filename}`);

    process.stdout.write(`  ${name}...`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; mongoball/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      writeFileSync(outputPath, text);

      const lines = text.split('\n').length - 1;
      console.log(` ${lines} rows`);
      downloadedFiles.push(outputPath);

      // Rate limiting
      await sleep(300);
    } catch (error) {
      console.log(` FAILED (${error})`);
      errors.push(`${name}: ${error}`);
    }
  }

  console.log(`  Downloaded ${downloadedFiles.length}/${leaderboards.length} leaderboards`);

  return {
    success: errors.length === 0,
    files: downloadedFiles,
    errors,
  };
}
