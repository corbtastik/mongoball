/**
 * Lahman Database Loaders
 *
 * Load data from the SABR Lahman Baseball Database into MongoDB.
 * Source: https://sabr.org/lahman-database/
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getCollection, getDb } from '../../connection.js';
import {
  COLLECTIONS,
  HallOfFameEntry,
  Award,
  AwardShare,
  Salary,
  School,
  CollegePlaying,
  AllStarAppearance,
  Manager,
  LahmanBatting,
  LahmanPitching,
} from '../../schema.js';
import { streamCSV, parseInt, batch } from '../../parsers.js';
import { LAHMAN_FILES } from '../../../lahman.js';

const BATCH_SIZE = 1000;

// Lookup maps for denormalization
let peopleLookup: Map<string, { nameFirst: string; nameLast: string }> = new Map();
let teamsLookup: Map<string, string> = new Map(); // yearId-teamId -> teamName
let schoolsLookup: Map<string, string> = new Map(); // schoolId -> name

/**
 * Build lookup maps from reference data
 */
async function buildLookups(lahmanDir: string): Promise<void> {
  // Build people lookup
  const peoplePath = join(lahmanDir, LAHMAN_FILES.people);
  if (existsSync(peoplePath)) {
    for await (const { row, headers } of streamCSV(peoplePath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers);
      if (obj.playerID) {
        peopleLookup.set(obj.playerID, {
          nameFirst: obj.nameFirst || '',
          nameLast: obj.nameLast || '',
        });
      }
    }
    console.log(`  People lookup: ${peopleLookup.size} entries`);
  }

  // Build schools lookup
  const schoolsPath = join(lahmanDir, LAHMAN_FILES.schools);
  if (existsSync(schoolsPath)) {
    for await (const { row, headers } of streamCSV(schoolsPath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers);
      if (obj.schoolID) {
        schoolsLookup.set(obj.schoolID, obj.name_full || obj.schoolID);
      }
    }
    console.log(`  Schools lookup: ${schoolsLookup.size} entries`);
  }
}

function rowToObject(row: string[], headers: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] || '';
  }
  return obj;
}

function getPlayerName(playerId: string): { nameFirst: string; nameLast: string } {
  return peopleLookup.get(playerId) || { nameFirst: '', nameLast: '' };
}

function getSchoolName(schoolId: string): string {
  return schoolsLookup.get(schoolId) || '';
}

/**
 * Load Hall of Fame data
 */
async function loadHallOfFame(lahmanDir: string): Promise<number> {
  const filePath = join(lahmanDir, LAHMAN_FILES.hallOfFame);
  if (!existsSync(filePath)) {
    console.log('  HallOfFame.csv not found, skipping');
    return 0;
  }

  console.log('  Loading Hall of Fame...');
  const collection = getCollection<HallOfFameEntry>(COLLECTIONS.HALL_OF_FAME);
  const entries: HallOfFameEntry[] = [];

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;
    const obj = rowToObject(row, headers);

    entries.push({
      playerId: obj.playerID,
      yearId: parseInt(obj.yearid) || 0,
      votedBy: obj.votedBy || '',
      ballots: parseInt(obj.ballots),
      needed: parseInt(obj.needed),
      votes: parseInt(obj.votes),
      inducted: obj.inducted === 'Y',
      category: obj.category || 'Player',
    });
  }

  if (entries.length > 0) {
    const batches = batch(entries, BATCH_SIZE);
    for (const b of batches) {
      await collection.insertMany(b, { ordered: false }).catch(() => {});
    }
  }

  console.log(`    Loaded ${entries.length} Hall of Fame entries`);
  return entries.length;
}

/**
 * Load Awards data
 */
async function loadAwards(lahmanDir: string): Promise<number> {
  const collection = getCollection<Award>(COLLECTIONS.AWARDS);
  let total = 0;

  // Player awards
  const playerAwardsPath = join(lahmanDir, LAHMAN_FILES.awardsPlayers);
  if (existsSync(playerAwardsPath)) {
    const entries: Award[] = [];
    for await (const { row, headers } of streamCSV(playerAwardsPath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers);
      const name = getPlayerName(obj.playerID);

      entries.push({
        playerId: obj.playerID,
        awardId: obj.awardID,
        yearId: parseInt(obj.yearID) || 0,
        leagueId: obj.lgID || '',
        tie: obj.tie === 'Y',
        notes: obj.notes || undefined,
        nameFirst: name.nameFirst,
        nameLast: name.nameLast,
      });
    }

    if (entries.length > 0) {
      const batches = batch(entries, BATCH_SIZE);
      for (const b of batches) {
        await collection.insertMany(b, { ordered: false }).catch(() => {});
      }
      total += entries.length;
    }
  }

  // Manager awards
  const managerAwardsPath = join(lahmanDir, LAHMAN_FILES.awardsManagers);
  if (existsSync(managerAwardsPath)) {
    const entries: Award[] = [];
    for await (const { row, headers } of streamCSV(managerAwardsPath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers);
      const name = getPlayerName(obj.playerID);

      entries.push({
        playerId: obj.playerID,
        awardId: obj.awardID,
        yearId: parseInt(obj.yearID) || 0,
        leagueId: obj.lgID || '',
        tie: obj.tie === 'Y',
        notes: obj.notes || undefined,
        nameFirst: name.nameFirst,
        nameLast: name.nameLast,
      });
    }

    if (entries.length > 0) {
      const batches = batch(entries, BATCH_SIZE);
      for (const b of batches) {
        await collection.insertMany(b, { ordered: false }).catch(() => {});
      }
      total += entries.length;
    }
  }

  console.log(`    Loaded ${total} awards`);
  return total;
}

/**
 * Load Award voting shares
 */
async function loadAwardShares(lahmanDir: string): Promise<number> {
  const collection = getCollection<AwardShare>(COLLECTIONS.AWARD_SHARES);
  let total = 0;

  // Player award shares
  const playerSharesPath = join(lahmanDir, LAHMAN_FILES.awardsSharePlayers);
  if (existsSync(playerSharesPath)) {
    const entries: AwardShare[] = [];
    for await (const { row, headers } of streamCSV(playerSharesPath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers);
      const name = getPlayerName(obj.playerID);

      entries.push({
        playerId: obj.playerID,
        awardId: obj.awardID,
        yearId: parseInt(obj.yearID) || 0,
        leagueId: obj.lgID || '',
        pointsWon: parseInt(obj.pointsWon) || 0,
        pointsMax: parseInt(obj.pointsMax) || 0,
        votesFirst: parseInt(obj.votesFirst),
        nameFirst: name.nameFirst,
        nameLast: name.nameLast,
      });
    }

    if (entries.length > 0) {
      const batches = batch(entries, BATCH_SIZE);
      for (const b of batches) {
        await collection.insertMany(b, { ordered: false }).catch(() => {});
      }
      total += entries.length;
    }
  }

  // Manager award shares
  const managerSharesPath = join(lahmanDir, LAHMAN_FILES.awardsShareManagers);
  if (existsSync(managerSharesPath)) {
    const entries: AwardShare[] = [];
    for await (const { row, headers } of streamCSV(managerSharesPath)) {
      if (!headers) continue;
      const obj = rowToObject(row, headers);
      const name = getPlayerName(obj.playerID);

      entries.push({
        playerId: obj.playerID,
        awardId: obj.awardID,
        yearId: parseInt(obj.yearID) || 0,
        leagueId: obj.lgID || '',
        pointsWon: parseInt(obj.pointsWon) || 0,
        pointsMax: parseInt(obj.pointsMax) || 0,
        votesFirst: parseInt(obj.votesFirst),
        nameFirst: name.nameFirst,
        nameLast: name.nameLast,
      });
    }

    if (entries.length > 0) {
      const batches = batch(entries, BATCH_SIZE);
      for (const b of batches) {
        await collection.insertMany(b, { ordered: false }).catch(() => {});
      }
      total += entries.length;
    }
  }

  console.log(`    Loaded ${total} award shares`);
  return total;
}

/**
 * Load Salaries
 */
async function loadSalaries(lahmanDir: string): Promise<number> {
  const filePath = join(lahmanDir, LAHMAN_FILES.salaries);
  if (!existsSync(filePath)) {
    console.log('  Salaries.csv not found, skipping');
    return 0;
  }

  console.log('  Loading Salaries...');
  const collection = getCollection<Salary>(COLLECTIONS.SALARIES);
  const entries: Salary[] = [];

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;
    const obj = rowToObject(row, headers);
    const name = getPlayerName(obj.playerID);

    entries.push({
      playerId: obj.playerID,
      yearId: parseInt(obj.yearID) || 0,
      teamId: obj.teamID,
      leagueId: obj.lgID || '',
      salary: parseInt(obj.salary) || 0,
      nameFirst: name.nameFirst,
      nameLast: name.nameLast,
    });
  }

  if (entries.length > 0) {
    const batches = batch(entries, BATCH_SIZE);
    for (const b of batches) {
      await collection.insertMany(b, { ordered: false }).catch(() => {});
    }
  }

  console.log(`    Loaded ${entries.length} salary records`);
  return entries.length;
}

/**
 * Load Schools
 */
async function loadSchools(lahmanDir: string): Promise<number> {
  const filePath = join(lahmanDir, LAHMAN_FILES.schools);
  if (!existsSync(filePath)) {
    console.log('  Schools.csv not found, skipping');
    return 0;
  }

  console.log('  Loading Schools...');
  const collection = getCollection<School>(COLLECTIONS.SCHOOLS);
  const entries: School[] = [];

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;
    const obj = rowToObject(row, headers);

    entries.push({
      schoolId: obj.schoolID,
      name: obj.name_full || '',
      city: obj.city || undefined,
      state: obj.state || undefined,
      country: obj.country || undefined,
    });
  }

  if (entries.length > 0) {
    await collection.insertMany(entries, { ordered: false }).catch(() => {});
  }

  console.log(`    Loaded ${entries.length} schools`);
  return entries.length;
}

/**
 * Load College Playing records
 */
async function loadCollegePlaying(lahmanDir: string): Promise<number> {
  const filePath = join(lahmanDir, LAHMAN_FILES.collegePlaying);
  if (!existsSync(filePath)) {
    console.log('  CollegePlaying.csv not found, skipping');
    return 0;
  }

  console.log('  Loading College Playing...');
  const collection = getCollection<CollegePlaying>(COLLECTIONS.COLLEGE_PLAYING);
  const entries: CollegePlaying[] = [];

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;
    const obj = rowToObject(row, headers);
    const name = getPlayerName(obj.playerid || obj.playerID);

    entries.push({
      playerId: obj.playerid || obj.playerID,
      schoolId: obj.schoolID,
      yearId: parseInt(obj.yearID) || 0,
      nameFirst: name.nameFirst,
      nameLast: name.nameLast,
      schoolName: getSchoolName(obj.schoolID),
    });
  }

  if (entries.length > 0) {
    const batches = batch(entries, BATCH_SIZE);
    for (const b of batches) {
      await collection.insertMany(b, { ordered: false }).catch(() => {});
    }
  }

  console.log(`    Loaded ${entries.length} college playing records`);
  return entries.length;
}

/**
 * Load All-Star appearances
 */
async function loadAllStarAppearances(lahmanDir: string): Promise<number> {
  const filePath = join(lahmanDir, LAHMAN_FILES.allStarFull);
  if (!existsSync(filePath)) {
    console.log('  AllstarFull.csv not found, skipping');
    return 0;
  }

  console.log('  Loading All-Star Appearances...');
  const collection = getCollection<AllStarAppearance>(COLLECTIONS.ALL_STAR_APPEARANCES);
  const entries: AllStarAppearance[] = [];

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;
    const obj = rowToObject(row, headers);
    const name = getPlayerName(obj.playerID);

    entries.push({
      playerId: obj.playerID,
      yearId: parseInt(obj.yearID) || 0,
      gameNum: parseInt(obj.gameNum) || 0,
      gameId: obj.gameID || undefined,
      teamId: obj.teamID,
      leagueId: obj.lgID || '',
      gamesPlayed: parseInt(obj.GP),
      startingPos: parseInt(obj.startingPos),
      nameFirst: name.nameFirst,
      nameLast: name.nameLast,
    });
  }

  if (entries.length > 0) {
    const batches = batch(entries, BATCH_SIZE);
    for (const b of batches) {
      await collection.insertMany(b, { ordered: false }).catch(() => {});
    }
  }

  console.log(`    Loaded ${entries.length} All-Star appearances`);
  return entries.length;
}

/**
 * Load Managers
 */
async function loadManagers(lahmanDir: string): Promise<number> {
  const filePath = join(lahmanDir, LAHMAN_FILES.managers);
  if (!existsSync(filePath)) {
    console.log('  Managers.csv not found, skipping');
    return 0;
  }

  console.log('  Loading Managers...');
  const collection = getCollection<Manager>(COLLECTIONS.MANAGERS);
  const entries: Manager[] = [];

  for await (const { row, headers } of streamCSV(filePath)) {
    if (!headers) continue;
    const obj = rowToObject(row, headers);
    const name = getPlayerName(obj.playerID);

    entries.push({
      playerId: obj.playerID,
      yearId: parseInt(obj.yearID) || 0,
      teamId: obj.teamID,
      leagueId: obj.lgID || '',
      inSeason: parseInt(obj.inseason) || 1,
      games: parseInt(obj.G) || 0,
      wins: parseInt(obj.W) || 0,
      losses: parseInt(obj.L) || 0,
      rank: parseInt(obj.rank),
      playerManager: obj.plyrMgr === 'Y',
      nameFirst: name.nameFirst,
      nameLast: name.nameLast,
    });
  }

  if (entries.length > 0) {
    const batches = batch(entries, BATCH_SIZE);
    for (const b of batches) {
      await collection.insertMany(b, { ordered: false }).catch(() => {});
    }
  }

  console.log(`    Loaded ${entries.length} manager records`);
  return entries.length;
}

/**
 * Create indexes for Lahman collections
 */
async function createLahmanIndexes(): Promise<void> {
  const db = getDb();

  console.log('  Creating Lahman indexes...');

  // Hall of Fame
  await db.collection(COLLECTIONS.HALL_OF_FAME).createIndexes([
    { key: { playerId: 1, yearId: -1 } },
    { key: { inducted: 1, yearId: -1 } },
    { key: { category: 1 } },
  ]);

  // Awards
  await db.collection(COLLECTIONS.AWARDS).createIndexes([
    { key: { playerId: 1, yearId: -1 } },
    { key: { awardId: 1, yearId: -1 } },
    { key: { yearId: 1, leagueId: 1 } },
  ]);

  // Award Shares
  await db.collection(COLLECTIONS.AWARD_SHARES).createIndexes([
    { key: { playerId: 1, yearId: -1 } },
    { key: { awardId: 1, yearId: -1, pointsWon: -1 } },
  ]);

  // Salaries
  await db.collection(COLLECTIONS.SALARIES).createIndexes([
    { key: { playerId: 1, yearId: -1 } },
    { key: { yearId: 1, salary: -1 } },
    { key: { teamId: 1, yearId: 1 } },
  ]);

  // Schools
  await db.collection(COLLECTIONS.SCHOOLS).createIndexes([
    { key: { schoolId: 1 }, unique: true },
    { key: { state: 1 } },
  ]);

  // College Playing
  await db.collection(COLLECTIONS.COLLEGE_PLAYING).createIndexes([
    { key: { playerId: 1 } },
    { key: { schoolId: 1 } },
  ]);

  // All-Star
  await db.collection(COLLECTIONS.ALL_STAR_APPEARANCES).createIndexes([
    { key: { playerId: 1, yearId: -1 } },
    { key: { yearId: 1, leagueId: 1 } },
  ]);

  // Managers
  await db.collection(COLLECTIONS.MANAGERS).createIndexes([
    { key: { playerId: 1, yearId: -1 } },
    { key: { teamId: 1, yearId: 1 } },
    { key: { yearId: 1, wins: -1 } },
  ]);

  console.log('    Lahman indexes created');
}

/**
 * Load all Lahman data
 */
export async function loadLahman(dataDir: string): Promise<number> {
  const lahmanDir = join(dataDir, 'reference', 'lahman');

  if (!existsSync(lahmanDir)) {
    console.log('Lahman directory not found. Run: npm run download -- --lahman-only');
    return 0;
  }

  console.log('Loading Lahman Baseball Database...');
  console.log(`  Source: ${lahmanDir}`);

  // Build lookup maps first
  console.log('  Building lookup maps...');
  await buildLookups(lahmanDir);

  let total = 0;

  // Load each collection
  total += await loadSchools(lahmanDir);
  total += await loadHallOfFame(lahmanDir);
  total += await loadAwards(lahmanDir);
  total += await loadAwardShares(lahmanDir);
  total += await loadSalaries(lahmanDir);
  total += await loadCollegePlaying(lahmanDir);
  total += await loadAllStarAppearances(lahmanDir);
  total += await loadManagers(lahmanDir);

  // Create indexes
  await createLahmanIndexes();

  console.log(`  Total Lahman records loaded: ${total.toLocaleString()}`);
  return total;
}

// Export individual loaders for selective loading
export {
  loadHallOfFame,
  loadAwards,
  loadAwardShares,
  loadSalaries,
  loadSchools,
  loadCollegePlaying,
  loadAllStarAppearances,
  loadManagers,
  createLahmanIndexes,
};
