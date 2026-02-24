#!/usr/bin/env npx tsx
/**
 * Calculate spray chart and hit probability for a batter
 *
 * Usage:
 *   npx tsx src/spray-chart.ts 656941          # By MLBAM ID (Schwarber)
 *   npx tsx src/spray-chart.ts --retro schwk001  # By Retrosheet ID
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

interface BattedBall {
  hc_x: number;
  hc_y: number;
  launch_speed: number;
  launch_angle: number;
  xba: number;
  events: string;
  stand: 'L' | 'R';
}

interface SprayStats {
  pull: { count: number; hits: number; xba: number[] };
  center: { count: number; hits: number; xba: number[] };
  oppo: { count: number; hits: number; xba: number[] };
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
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
 * Determine spray direction based on hit coordinates and batter handedness
 */
function getSprayDirection(
  hc_x: number,
  stand: 'L' | 'R'
): 'pull' | 'center' | 'oppo' {
  // Home plate is approximately at x=125
  // Lower x = left field, higher x = right field
  if (hc_x < 100) {
    return stand === 'R' ? 'pull' : 'oppo';
  } else if (hc_x > 150) {
    return stand === 'R' ? 'oppo' : 'pull';
  }
  return 'center';
}

/**
 * Check if event is a hit
 */
function isHit(events: string): boolean {
  return ['single', 'double', 'triple', 'home_run'].includes(events);
}

/**
 * Lookup MLBAM ID from Retrosheet ID
 */
async function lookupMLBAMId(retroId: string): Promise<string | null> {
  const crosswalkPath = join(process.cwd(), 'chadwick_register.csv');

  return new Promise((resolve) => {
    const rl = createInterface({
      input: createReadStream(crosswalkPath),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      const fields = line.split(',');
      if (fields[3] === retroId) {
        rl.close();
        resolve(fields[2]); // key_mlbam
      }
    });

    rl.on('close', () => resolve(null));
  });
}

/**
 * Calculate spray chart stats for a batter
 */
async function calculateSprayChart(mlbamId: string): Promise<void> {
  const statcastPath = join(process.cwd(), '2023_statcast.csv');

  const stats: SprayStats = {
    pull: { count: 0, hits: 0, xba: [] },
    center: { count: 0, hits: 0, xba: [] },
    oppo: { count: 0, hits: 0, xba: [] },
  };

  let totalBattedBalls = 0;
  let totalHits = 0;
  let playerName = '';
  let stand: 'L' | 'R' = 'R';
  let headerIndices: Record<string, number> = {};

  const rl = createInterface({
    input: createReadStream(statcastPath),
    crlfDelay: Infinity,
  });

  let isHeader = true;

  for await (const line of rl) {
    const fields = parseCSVLine(line);

    if (isHeader) {
      fields.forEach((field, idx) => {
        headerIndices[field] = idx;
      });
      isHeader = false;
      continue;
    }

    const batterId = fields[headerIndices['batter']];
    if (batterId !== mlbamId) continue;

    const hc_x = parseFloat(fields[headerIndices['hc_x']]);
    const hc_y = parseFloat(fields[headerIndices['hc_y']]);
    const events = fields[headerIndices['events']];
    const xba = parseFloat(fields[headerIndices['estimated_ba_using_speedangle']]);
    const batterStand = fields[headerIndices['stand']] as 'L' | 'R';

    if (!playerName) {
      playerName = fields[headerIndices['player_name']]?.replace(/"/g, '') || mlbamId;
      // Note: player_name in statcast is pitcher name, we need another lookup
    }

    stand = batterStand;

    // Only count batted balls (have hit coordinates)
    if (isNaN(hc_x) || isNaN(hc_y)) continue;

    totalBattedBalls++;
    const direction = getSprayDirection(hc_x, stand);

    stats[direction].count++;
    if (!isNaN(xba)) stats[direction].xba.push(xba);

    if (isHit(events)) {
      totalHits++;
      stats[direction].hits++;
    }
  }

  // Calculate averages
  const avgXba = (xbaArray: number[]) =>
    xbaArray.length > 0
      ? (xbaArray.reduce((a, b) => a + b, 0) / xbaArray.length).toFixed(3)
      : 'N/A';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Spray Chart Analysis - Batter ${mlbamId} (${stand}HB)`);
  console.log('='.repeat(60));

  console.log(`\nTotal Batted Balls: ${totalBattedBalls}`);
  console.log(`Total Hits: ${totalHits}`);
  console.log(`Batting Avg on Contact: ${(totalHits / totalBattedBalls).toFixed(3)}`);

  console.log(`\n${'─'.repeat(60)}`);
  console.log('Direction Analysis');
  console.log('─'.repeat(60));

  console.log('\n| Direction | Batted Balls |    % | Hits | Hit% |  Avg xBA |');
  console.log('|-----------|-------------:|-----:|-----:|-----:|---------:|');

  for (const [dir, data] of Object.entries(stats)) {
    const pct = ((data.count / totalBattedBalls) * 100).toFixed(1);
    const hitPct = data.count > 0 ? ((data.hits / data.count) * 100).toFixed(1) : '0.0';
    const xbaAvg = avgXba(data.xba);
    const label = dir.charAt(0).toUpperCase() + dir.slice(1);
    console.log(
      `| ${label.padEnd(9)} | ${data.count.toString().padStart(12)} | ${pct.padStart(4)}% | ${data.hits.toString().padStart(4)} | ${hitPct.padStart(4)}% | ${xbaAvg.padStart(8)} |`
    );
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log('Spray Chart Visualization');
  console.log('─'.repeat(60));

  const pullPct = ((stats.pull.count / totalBattedBalls) * 100).toFixed(0);
  const centerPct = ((stats.center.count / totalBattedBalls) * 100).toFixed(0);
  const oppoPct = ((stats.oppo.count / totalBattedBalls) * 100).toFixed(0);

  if (stand === 'R') {
    console.log(`
              CF
            ${centerPct}%
           /    \\
      LF           RF
     ${pullPct}%           ${oppoPct}%
    (Pull)       (Oppo)
       \\    |    /
        \\   |   /
         \\  |  /
          [${stand}HB]
    `);
  } else {
    console.log(`
              CF
            ${centerPct}%
           /    \\
      LF           RF
     ${oppoPct}%           ${pullPct}%
    (Oppo)       (Pull)
       \\    |    /
        \\   |   /
         \\  |  /
          [${stand}HB]
    `);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx tsx src/spray-chart.ts <mlbam_id>');
    console.log('  npx tsx src/spray-chart.ts --retro <retrosheet_id>');
    console.log('\nExamples:');
    console.log('  npx tsx src/spray-chart.ts 656941           # Kyle Schwarber');
    console.log('  npx tsx src/spray-chart.ts --retro schwk001 # Kyle Schwarber');
    process.exit(1);
  }

  let mlbamId: string;

  if (args[0] === '--retro' && args[1]) {
    console.log(`Looking up Retrosheet ID: ${args[1]}...`);
    const id = await lookupMLBAMId(args[1]);
    if (!id) {
      console.error(`Could not find MLBAM ID for Retrosheet ID: ${args[1]}`);
      process.exit(1);
    }
    mlbamId = id;
    console.log(`Found MLBAM ID: ${mlbamId}`);
  } else {
    mlbamId = args[0];
  }

  await calculateSprayChart(mlbamId);
}

main().catch(console.error);
