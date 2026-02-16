#!/usr/bin/env npx tsx
/**
 * Get plate appearance outcomes for a matchup
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

async function getOutcomes(batterId: string, pitcherId: string): Promise<void> {
  const statcastPath = join(process.cwd(), '2023_statcast.csv');
  const outcomes: Record<string, number> = {};
  let headerIndices: Record<string, number> = {};
  let isHeader = true;
  let totalPA = 0;

  const rl = createInterface({
    input: createReadStream(statcastPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const fields = parseCSVLine(line);
    if (isHeader) {
      fields.forEach((f, i) => headerIndices[f] = i);
      isHeader = false;
      continue;
    }

    if (fields[headerIndices['batter']] !== batterId) continue;
    if (fields[headerIndices['pitcher']] !== pitcherId) continue;

    const event = fields[headerIndices['events']];
    if (event && event.length > 0) {
      outcomes[event] = (outcomes[event] || 0) + 1;
      totalPA++;
    }
  }

  console.log(`\nPlate Appearance Outcomes (${totalPA} total):\n`);
  const sorted = Object.entries(outcomes).sort((a, b) => b[1] - a[1]);

  console.log('| Outcome | Count | % |');
  console.log('|---------|------:|--:|');
  for (const [outcome, count] of sorted) {
    const pct = ((count / totalPA) * 100).toFixed(1);
    console.log(`| ${outcome} | ${count} | ${pct}% |`);
  }
}

const [batterId, pitcherId] = process.argv.slice(2);
if (!batterId || !pitcherId) {
  console.log('Usage: npx tsx src/matchup-outcomes.ts <batter_id> <pitcher_id>');
  process.exit(1);
}
getOutcomes(batterId, pitcherId);
