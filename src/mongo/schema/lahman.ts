/**
 * Lahman Schema Definitions
 *
 * Type definitions for Lahman Baseball Database collections:
 * Hall of Fame, Awards, Salaries, Schools, All-Star appearances, etc.
 */

// ============================================================================
// Hall of Fame
// ============================================================================

export interface HallOfFameEntry {
  playerId: string;           // Lahman playerID (= bbrefId)
  yearId: number;             // Year of voting/induction
  votedBy: string;            // BBWAA, Veterans, etc.
  ballots?: number;
  needed?: number;
  votes?: number;
  inducted: boolean;
  category: string;           // Player, Manager, Pioneer, etc.
}

// ============================================================================
// Awards
// ============================================================================

export interface Award {
  playerId: string;
  awardId: string;            // MVP, Cy Young, ROY, etc.
  yearId: number;
  leagueId: string;           // AL, NL
  tie?: boolean;
  notes?: string;
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
}

export interface AwardShare {
  playerId: string;
  awardId: string;
  yearId: number;
  leagueId: string;
  pointsWon: number;
  pointsMax: number;
  votesFirst?: number;
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
}

// ============================================================================
// Salaries
// ============================================================================

export interface Salary {
  playerId: string;
  yearId: number;
  teamId: string;
  leagueId: string;
  salary: number;
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
  teamName?: string;
}

// ============================================================================
// Schools & College Playing
// ============================================================================

export interface School {
  schoolId: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface CollegePlaying {
  playerId: string;
  schoolId: string;
  yearId: number;
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
  schoolName?: string;
}

// ============================================================================
// All-Star Appearances
// ============================================================================

export interface AllStarAppearance {
  playerId: string;
  yearId: number;
  gameNum: number;
  gameId?: string;
  teamId: string;
  leagueId: string;
  gamesPlayed?: number;
  startingPos?: number;
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
}

// ============================================================================
// Managers
// ============================================================================

export interface Manager {
  playerId: string;           // Manager's playerID
  yearId: number;
  teamId: string;
  leagueId: string;
  inSeason: number;           // Manager number that year (for mid-season changes)
  games: number;
  wins: number;
  losses: number;
  rank?: number;
  playerManager: boolean;     // Was also a player that year
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
  teamName?: string;
}

// ============================================================================
// Lahman Season Stats (historical back to 1871)
// ============================================================================

export interface LahmanBatting {
  playerId: string;
  yearId: number;
  stint: number;
  teamId: string;
  leagueId: string;
  games: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  stolenBases: number;
  caughtStealing?: number;
  walks: number;
  strikeouts?: number;
  intentionalWalks?: number;
  hitByPitch?: number;
  sacrificeHits?: number;
  sacrificeFlies?: number;
  groundedIntoDP?: number;
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
  teamName?: string;
}

export interface LahmanPitching {
  playerId: string;
  yearId: number;
  stint: number;
  teamId: string;
  leagueId: string;
  wins: number;
  losses: number;
  games: number;
  gamesStarted: number;
  completeGames: number;
  shutouts: number;
  saves: number;
  ipOuts: number;             // Innings pitched * 3
  hits: number;
  earnedRuns: number;
  homeRuns: number;
  walks: number;
  strikeouts: number;
  era?: number;
  intentionalWalks?: number;
  wildPitches?: number;
  hitBatters?: number;
  balks?: number;
  battersFaced?: number;
  gamesFinished?: number;
  runs?: number;
  // Denormalized
  nameFirst?: string;
  nameLast?: string;
  teamName?: string;
}
