#!/usr/bin/env node
/**
 * MongoDB Data Verification
 *
 * Runs test queries against MongoDB to verify data was loaded correctly.
 *
 * Usage:
 *   npx tsx src/mongo/verify.ts
 *   npx tsx src/mongo/verify.ts --uri mongodb://localhost:27017 --database mlb
 *   npx tsx src/mongo/verify.ts --year 2023
 */

import { Command } from 'commander';
import { connect, disconnect, getDb } from './connection.js';
import { COLLECTIONS } from './schema.js';

interface VerifyOptions {
  uri: string;
  database: string;
  year: number;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  count?: number;
  sample?: unknown;
}

async function runTests(options: VerifyOptions): Promise<TestResult[]> {
  const db = getDb();
  const results: TestResult[] = [];
  const year = options.year;

  // Test 1: Players collection has data
  try {
    const playerCount = await db.collection(COLLECTIONS.PLAYERS).countDocuments();
    const samplePlayer = await db.collection(COLLECTIONS.PLAYERS).findOne({});
    results.push({
      name: 'Players collection',
      passed: playerCount > 0,
      message: playerCount > 0 ? `${playerCount.toLocaleString()} players loaded` : 'No players found',
      count: playerCount,
      sample: samplePlayer ? { playerId: samplePlayer.playerId, name: samplePlayer.name } : null,
    });
  } catch (e) {
    results.push({ name: 'Players collection', passed: false, message: String(e) });
  }

  // Test 2: Games for the specified year
  try {
    const gameCount = await db.collection(COLLECTIONS.GAMES).countDocuments({ season: year });
    const sampleGame = await db.collection(COLLECTIONS.GAMES).findOne({ season: year });
    results.push({
      name: `Games for ${year}`,
      passed: gameCount > 2000,
      message: gameCount > 0 ? `${gameCount.toLocaleString()} games` : 'No games found',
      count: gameCount,
      sample: sampleGame ? { gameId: sampleGame.gameId, home: sampleGame.home?.teamId, away: sampleGame.away?.teamId } : null,
    });
  } catch (e) {
    results.push({ name: `Games for ${year}`, passed: false, message: String(e) });
  }

  // Test 3: Pitches (Statcast) for the specified year
  try {
    const pitchCount = await db.collection(COLLECTIONS.PITCHES).countDocuments({ season: year });
    const samplePitch = await db.collection(COLLECTIONS.PITCHES).findOne({ season: year });
    results.push({
      name: `Pitches (Statcast) for ${year}`,
      passed: pitchCount > 500000,
      message: pitchCount > 0 ? `${pitchCount.toLocaleString()} pitches` : 'No pitches found',
      count: pitchCount,
      sample: samplePitch ? {
        pitcher: samplePitch.pitcher?.name,
        pitchType: samplePitch.pitch?.type,
        speed: samplePitch.pitch?.speed
      } : null,
    });
  } catch (e) {
    results.push({ name: `Pitches (Statcast) for ${year}`, passed: false, message: String(e) });
  }

  // Test 4: Rosters for the specified year
  try {
    const rosterCount = await db.collection(COLLECTIONS.ROSTERS).countDocuments({ season: year });
    results.push({
      name: `Rosters for ${year}`,
      passed: rosterCount >= 30,
      message: rosterCount > 0 ? `${rosterCount} team rosters` : 'No rosters found',
      count: rosterCount,
    });
  } catch (e) {
    results.push({ name: `Rosters for ${year}`, passed: false, message: String(e) });
  }

  // Test 5: Teams collection
  try {
    const teamCount = await db.collection(COLLECTIONS.TEAMS).countDocuments();
    results.push({
      name: 'Teams collection',
      passed: teamCount >= 30,
      message: teamCount > 0 ? `${teamCount} teams` : 'No teams found',
      count: teamCount,
    });
  } catch (e) {
    results.push({ name: 'Teams collection', passed: false, message: String(e) });
  }

  // Test 6: Query - Find a specific pitch type distribution
  try {
    const pitchTypes = await db.collection(COLLECTIONS.PITCHES).aggregate([
      { $match: { season: year } },
      { $group: { _id: '$pitch.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();
    results.push({
      name: 'Pitch type distribution query',
      passed: pitchTypes.length > 0,
      message: pitchTypes.length > 0 ? `Top 5 pitch types found` : 'No pitch types found',
      sample: pitchTypes.slice(0, 3).map(p => ({ type: p._id, count: p.count })),
    });
  } catch (e) {
    results.push({ name: 'Pitch type distribution query', passed: false, message: String(e) });
  }

  // Test 7: Query - Home run leaders
  try {
    const hrLeaders = await db.collection(COLLECTIONS.PITCHES).aggregate([
      { $match: { season: year, 'batted.outcome': 'home_run' } },
      { $group: { _id: '$batter.playerId', homeRuns: { $sum: 1 } } },
      { $sort: { homeRuns: -1 } },
      { $limit: 5 },
    ]).toArray();
    results.push({
      name: 'Home run leaders query',
      passed: hrLeaders.length > 0,
      message: hrLeaders.length > 0 ? `Found ${hrLeaders.length} HR leaders` : 'No home runs found',
      sample: hrLeaders.slice(0, 3),
    });
  } catch (e) {
    results.push({ name: 'Home run leaders query', passed: false, message: String(e) });
  }

  // Test 8: Hall of Fame collection (Lahman)
  try {
    const hofCount = await db.collection(COLLECTIONS.HALL_OF_FAME).countDocuments();
    const inductees = await db.collection(COLLECTIONS.HALL_OF_FAME).countDocuments({ inducted: true });
    results.push({
      name: 'Hall of Fame (Lahman)',
      passed: hofCount > 0,
      message: hofCount > 0 ? `${hofCount.toLocaleString()} records, ${inductees} inducted` : 'No HOF data (run --collections lahman)',
      count: hofCount,
    });
  } catch (e) {
    results.push({ name: 'Hall of Fame (Lahman)', passed: false, message: String(e) });
  }

  // Test 9: Awards collection (Lahman)
  try {
    const awardCount = await db.collection(COLLECTIONS.AWARDS).countDocuments();
    const mvpCount = await db.collection(COLLECTIONS.AWARDS).countDocuments({ awardId: 'MVP' });
    results.push({
      name: 'Awards (Lahman)',
      passed: awardCount > 0,
      message: awardCount > 0 ? `${awardCount.toLocaleString()} awards, ${mvpCount} MVPs` : 'No awards data (run --collections lahman)',
      count: awardCount,
    });
  } catch (e) {
    results.push({ name: 'Awards (Lahman)', passed: false, message: String(e) });
  }

  // Test 10: Salaries collection (Lahman)
  try {
    const salaryCount = await db.collection(COLLECTIONS.SALARIES).countDocuments();
    const maxSalary = await db.collection(COLLECTIONS.SALARIES).findOne({}, { sort: { salary: -1 } });
    results.push({
      name: 'Salaries (Lahman)',
      passed: salaryCount > 0,
      message: salaryCount > 0
        ? `${salaryCount.toLocaleString()} records, max: $${maxSalary?.salary?.toLocaleString() || 'N/A'}`
        : 'No salary data (run --collections lahman)',
      count: salaryCount,
      sample: maxSalary ? { player: `${maxSalary.nameFirst} ${maxSalary.nameLast}`, salary: maxSalary.salary, year: maxSalary.yearId } : null,
    });
  } catch (e) {
    results.push({ name: 'Salaries (Lahman)', passed: false, message: String(e) });
  }

  return results;
}

async function main() {
  const program = new Command();

  program
    .name('verify')
    .description('Verify MongoDB data integrity with test queries')
    .option('--uri <uri>', 'MongoDB connection URI', 'mongodb://localhost:27017')
    .option('--database <name>', 'Database name', 'mlb')
    .option('--year <year>', 'Season year to verify', '2023')
    .action(async (opts) => {
      const options: VerifyOptions = {
        uri: opts.uri,
        database: opts.database,
        year: Number.parseInt(opts.year, 10),
      };

      console.log('='.repeat(70));
      console.log('MongoDB Data Verification');
      console.log('='.repeat(70));
      console.log(`Database: ${options.database}`);
      console.log(`Year: ${options.year}`);
      console.log('');

      try {
        await connect({ uri: options.uri, database: options.database });

        const results = await runTests(options);

        // Print results
        console.log('Test Results:');
        console.log('-'.repeat(70));

        let passed = 0;
        let failed = 0;

        for (const result of results) {
          const status = result.passed ? '✓' : '✗';
          const color = result.passed ? '\x1b[32m' : '\x1b[31m';
          const reset = '\x1b[0m';

          console.log(`${color}${status}${reset} ${result.name}`);
          console.log(`    ${result.message}`);
          if (result.sample) {
            console.log(`    Sample: ${JSON.stringify(result.sample)}`);
          }
          console.log('');

          if (result.passed) passed++;
          else failed++;
        }

        // Summary
        console.log('='.repeat(70));
        console.log(`Summary: ${passed} passed, ${failed} failed out of ${results.length} tests`);
        console.log('='.repeat(70));

        await disconnect();

        // Exit with error code if any tests failed
        if (failed > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main();
