/**
 * MongoDB Schema Definitions
 *
 * Re-exports all types from schema/ directory for backward compatibility.
 *
 * Schema files:
 *   schema/core.ts       - Player, Game, Pitch, Team, Venue, Roster, etc.
 *   schema/lahman.ts     - HallOfFame, Awards, Salaries, etc.
 *   schema/collections.ts - Collection name constants
 */

export * from './schema/index.js';
