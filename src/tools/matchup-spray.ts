#!/usr/bin/env npx tsx
/**
 * Calculate spray chart for a specific batter vs pitcher matchup
 *
 * Usage:
 *   npx tsx src/matchup-spray.ts <batter_id> <pitcher_id>
 *   npx tsx src/matchup-spray.ts 656941 675911  # Schwarber vs Strider
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

interface SprayStats {
  pull: { count: number; hits: number; xba: number[]; events: string[] };
  center: { count: number; hits: number; xba: number[]; events: string[] };
  oppo: { count: number; hits: number; xba: number[]; events: string[] };
}

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

function getSprayDirection(hc_x: number, stand: 'L' | 'R'): 'pull' | 'center' | 'oppo' {
  if (hc_x < 100) {
    return stand === 'R' ? 'pull' : 'oppo';
  } else if (hc_x > 150) {
    return stand === 'R' ? 'oppo' : 'pull';
  }
  return 'center';
}

function isHit(events: string): boolean {
  return ['single', 'double', 'triple', 'home_run'].includes(events);
}

async function analyzeMatchup(batterId: string, pitcherId: string): Promise<void> {
  const statcastPath = join(process.cwd(), '2023_statcast.csv');

  const stats: SprayStats = {
    pull: { count: 0, hits: 0, xba: [], events: [] },
    center: { count: 0, hits: 0, xba: [], events: [] },
    oppo: { count: 0, hits: 0, xba: [], events: [] },
  };

  let totalPitches = 0;
  let totalBattedBalls = 0;
  let totalHits = 0;
  let stand: 'L' | 'R' = 'R';
  let headerIndices: Record<string, number> = {};

  // Pitch type tracking
  const pitchTypes: Record<string, number> = {};
  const swings: { type: string; result: string }[] = [];

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

    const batter = fields[headerIndices['batter']];
    const pitcher = fields[headerIndices['pitcher']];

    if (batter !== batterId || pitcher !== pitcherId) continue;

    totalPitches++;

    const pitchType = fields[headerIndices['pitch_type']];
    const description = fields[headerIndices['description']];
    const events = fields[headerIndices['events']];
    const hc_x = parseFloat(fields[headerIndices['hc_x']]);
    const hc_y = parseFloat(fields[headerIndices['hc_y']]);
    const xba = parseFloat(fields[headerIndices['estimated_ba_using_speedangle']]);
    const batterStand = fields[headerIndices['stand']] as 'L' | 'R';
    const launchSpeed = fields[headerIndices['launch_speed']];
    const launchAngle = fields[headerIndices['launch_angle']];

    stand = batterStand;

    // Track pitch types
    pitchTypes[pitchType] = (pitchTypes[pitchType] || 0) + 1;

    // Only count batted balls (have hit coordinates)
    if (isNaN(hc_x) || isNaN(hc_y)) continue;

    totalBattedBalls++;
    const direction = getSprayDirection(hc_x, stand);

    stats[direction].count++;
    stats[direction].events.push(`${events} (${launchSpeed} mph, ${launchAngle}°)`);
    if (!isNaN(xba)) stats[direction].xba.push(xba);

    if (isHit(events)) {
      totalHits++;
      stats[direction].hits++;
    }
  }

  const avgXba = (xbaArray: number[]) =>
    xbaArray.length > 0
      ? (xbaArray.reduce((a, b) => a + b, 0) / xbaArray.length).toFixed(3)
      : 'N/A';

  console.log(`\n${'='.repeat(65)}`);
  console.log(`Matchup Analysis: Batter ${batterId} vs Pitcher ${pitcherId}`);
  console.log('='.repeat(65));

  console.log(`\nBatter: ${batterId} (${stand}HB)`);
  console.log(`Pitcher: ${pitcherId}`);

  console.log(`\n${'─'.repeat(65)}`);
  console.log('Pitch Summary');
  console.log('─'.repeat(65));
  console.log(`Total Pitches: ${totalPitches}`);
  console.log(`Batted Balls: ${totalBattedBalls}`);
  console.log(`Hits: ${totalHits}`);
  if (totalBattedBalls > 0) {
    console.log(`BABIP: ${(totalHits / totalBattedBalls).toFixed(3)}`);
  }

  console.log(`\nPitch Type Distribution:`);
  const sortedPitches = Object.entries(pitchTypes).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedPitches) {
    const pct = ((count / totalPitches) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${pct}%)`);
  }

  if (totalBattedBalls === 0) {
    console.log('\nNo batted balls in this matchup.');
    return;
  }

  console.log(`\n${'─'.repeat(65)}`);
  console.log('Spray Chart Analysis');
  console.log('─'.repeat(65));

  console.log('\n| Direction | Batted Balls |    % | Hits | Hit% |  Avg xBA |');
  console.log('|-----------|-------------:|-----:|-----:|-----:|---------:|');

  for (const [dir, data] of Object.entries(stats)) {
    if (data.count === 0) continue;
    const pct = ((data.count / totalBattedBalls) * 100).toFixed(1);
    const hitPct = ((data.hits / data.count) * 100).toFixed(1);
    const xbaAvg = avgXba(data.xba);
    const label = dir.charAt(0).toUpperCase() + dir.slice(1);
    console.log(
      `| ${label.padEnd(9)} | ${data.count.toString().padStart(12)} | ${pct.padStart(4)}% | ${data.hits.toString().padStart(4)} | ${hitPct.padStart(4)}% | ${xbaAvg.padStart(8)} |`
    );
  }

  // Visual
  const pullPct = totalBattedBalls > 0 ? ((stats.pull.count / totalBattedBalls) * 100).toFixed(0) : '0';
  const centerPct = totalBattedBalls > 0 ? ((stats.center.count / totalBattedBalls) * 100).toFixed(0) : '0';
  const oppoPct = totalBattedBalls > 0 ? ((stats.oppo.count / totalBattedBalls) * 100).toFixed(0) : '0';

  console.log(`\n${'─'.repeat(65)}`);
  console.log('Spray Chart Visualization');
  console.log('─'.repeat(65));

  if (stand === 'L') {
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
          [LHB]
    `);
  } else {
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
          [RHB]
    `);
  }

  // Detail on each batted ball
  console.log('─'.repeat(65));
  console.log('Batted Ball Details');
  console.log('─'.repeat(65));

  for (const [dir, data] of Object.entries(stats)) {
    if (data.events.length === 0) continue;
    const label = dir.charAt(0).toUpperCase() + dir.slice(1);
    console.log(`\n${label}:`);
    data.events.forEach((e: string, i: number) => console.log(`  ${i + 1}. ${e}`));
  }
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx src/matchup-spray.ts <batter_id> <pitcher_id>');
  console.log('Example: npx tsx src/matchup-spray.ts 656941 675911  # Schwarber vs Strider');
  process.exit(1);
}

analyzeMatchup(args[0], args[1]).catch(console.error);
