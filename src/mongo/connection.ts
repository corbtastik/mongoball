/**
 * MongoDB Connection Handler
 *
 * Manages database connections and provides collection access.
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';
import { COLLECTIONS } from './schema.js';

const DEFAULT_URI = 'mongodb://localhost:27017';
const DEFAULT_DB = 'mlb';

let client: MongoClient | null = null;
let db: Db | null = null;

export interface ConnectionOptions {
  uri?: string;
  database?: string;
}

/**
 * Connect to MongoDB
 */
export async function connect(options: ConnectionOptions = {}): Promise<Db> {
  const uri = options.uri || process.env.MONGODB_URI || DEFAULT_URI;
  const dbName = options.database || process.env.MONGODB_DATABASE || DEFAULT_DB;

  if (db) {
    return db;
  }

  console.log(`Connecting to MongoDB: ${uri}`);
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log(`Connected to database: ${dbName}`);

  return db;
}

/**
 * Disconnect from MongoDB
 */
export async function disconnect(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Get database instance
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return db;
}

/**
 * Get a typed collection
 */
export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

/**
 * Drop all MLB collections (for fresh migration)
 */
export async function dropAllCollections(): Promise<void> {
  const database = getDb();
  const collections = Object.values(COLLECTIONS);

  for (const name of collections) {
    try {
      await database.collection(name).drop();
      console.log(`  Dropped collection: ${name}`);
    } catch (error: unknown) {
      // Collection doesn't exist, ignore
      if ((error as { codeName?: string }).codeName !== 'NamespaceNotFound') {
        throw error;
      }
    }
  }
}

/**
 * Create all indexes
 */
export async function createIndexes(): Promise<void> {
  const database = getDb();

  console.log('Creating indexes...');

  // Players
  await database.collection(COLLECTIONS.PLAYERS).createIndexes([
    { key: { playerId: 1 }, unique: true },
    {
      key: { mlbamId: 1 },
      unique: true,
      partialFilterExpression: { mlbamId: { $type: 'number' } },
    },
    { key: { 'name.last': 1, 'name.first': 1 } },
    { key: { seasonsActive: 1 } },
  ]);
  console.log('  Created indexes: players');

  // Player Seasons
  await database.collection(COLLECTIONS.PLAYER_SEASONS).createIndexes([
    { key: { playerId: 1, season: -1 }, unique: true },
    { key: { season: 1, teams: 1 } },
    { key: { season: 1, 'pitching.strikeouts': -1 } },
    { key: { season: 1, 'batting.homeRuns': -1 } },
    { key: { mlbamId: 1, season: -1 } },
  ]);
  console.log('  Created indexes: playerSeasons');

  // Games
  await database.collection(COLLECTIONS.GAMES).createIndexes([
    { key: { gameId: 1 }, unique: true },
    { key: { season: 1, date: -1 } },
    { key: { season: 1, gameType: 1 } },
    { key: { season: 1, 'home.teamId': 1 } },
    { key: { season: 1, 'away.teamId': 1 } },
    { key: { date: -1 } },
  ]);
  console.log('  Created indexes: games');

  // Pitches
  await database.collection(COLLECTIONS.PITCHES).createIndexes([
    { key: { gameId: 1, atBatNumber: 1, pitchNumber: 1 } },
    { key: { season: 1, 'pitcher.playerId': 1, date: -1 } },
    { key: { season: 1, 'batter.playerId': 1, date: -1 } },
    { key: { 'pitcher.playerId': 1, 'batter.playerId': 1, season: 1 } },
    { key: { season: 1, date: -1 } },
    { key: { 'pitch.type': 1, season: 1 } },
  ]);
  console.log('  Created indexes: pitches');

  // Plays
  await database.collection(COLLECTIONS.PLAYS).createIndexes([
    { key: { gameId: 1, playNumber: 1 } },
    { key: { season: 1, batterId: 1 } },
    { key: { season: 1, pitcherId: 1 } },
    { key: { season: 1, 'event.type': 1 } },
  ]);
  console.log('  Created indexes: plays');

  // Teams
  await database.collection(COLLECTIONS.TEAMS).createIndexes([
    { key: { teamId: 1 }, unique: true },
  ]);
  console.log('  Created indexes: teams');

  // Venues
  await database.collection(COLLECTIONS.VENUES).createIndexes([
    { key: { venueId: 1 }, unique: true },
  ]);
  console.log('  Created indexes: venues');

  // Rosters
  await database.collection(COLLECTIONS.ROSTERS).createIndexes([
    { key: { teamId: 1, season: 1 }, unique: true },
    { key: { season: 1 } },
    { key: { 'players.playerId': 1 } },
  ]);
  console.log('  Created indexes: rosters');

  // Transactions
  await database.collection(COLLECTIONS.TRANSACTIONS).createIndexes([
    { key: { playerId: 1, date: -1 } },
    { key: { season: 1, type: 1 } },
    { key: { date: -1 } },
  ]);
  console.log('  Created indexes: transactions');

  // Ejections
  await database.collection(COLLECTIONS.EJECTIONS).createIndexes([
    { key: { gameId: 1 } },
    { key: { season: 1, date: -1 } },
    { key: { 'ejectee.playerId': 1 } },
    { key: { 'umpire.umpireId': 1 } },
  ]);
  console.log('  Created indexes: ejections');

  console.log('All indexes created');
}

/**
 * Get collection statistics
 */
export async function getStats(): Promise<Record<string, number>> {
  const database = getDb();
  const stats: Record<string, number> = {};

  for (const name of Object.values(COLLECTIONS)) {
    const count = await database.collection(name).countDocuments();
    stats[name] = count;
  }

  return stats;
}
