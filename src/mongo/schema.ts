/**
 * MongoDB Schema Definitions
 *
 * Type definitions for all MLB data collections.
 * Uses camelCase field names and consistent ID naming.
 */

// ============================================================================
// Player Collection
// ============================================================================

export interface PlayerName {
  first: string;
  last: string;
  given?: string;
}

export interface BirthDeath {
  date?: Date;
  city?: string;
  state?: string;
  country?: string;
}

export interface Physical {
  bats: 'R' | 'L' | 'B';
  throws: 'R' | 'L' | 'B';
  height?: number;  // inches
  weight?: number;  // pounds
}

export interface Player {
  playerId: string;           // Retrosheet ID (primary)
  mlbamId?: number;           // MLB/Statcast ID
  bbrefId?: string;           // Baseball Reference
  fangraphsId?: number;       // FanGraphs
  name: PlayerName;
  birth?: BirthDeath;
  death?: BirthDeath;
  physical?: Physical;
  mlbDebut?: Date;
  finalGame?: Date;
  seasonsActive: number[];
  isHallOfFame: boolean;
}

// ============================================================================
// Player Seasons Collection
// ============================================================================

export interface BattingStats {
  games: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  avg?: number;
  obp?: number;
  slg?: number;
}

export interface PitchingStats {
  games: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  saves: number;
  inningsOuts: number;        // Innings as outs (e.g., 186.2 IP = 560)
  hits: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRuns: number;
  era?: number;
  whip?: number;
}

export interface FieldingStats {
  games: number;
  position: string;
  putouts: number;
  assists: number;
  errors: number;
  doublePlays: number;
}

export interface StatcastAggregates {
  pitchesThrown?: number;
  pitchesSeen?: number;
  avgFastballSpeed?: number;
  avgSpinRate?: number;
  avgExitVelocity?: number;
  avgLaunchAngle?: number;
  whiffRate?: number;
  chaseRate?: number;
}

export interface PlayerSeason {
  playerId: string;
  mlbamId?: number;
  season: number;
  teams: string[];
  positions: string[];
  batting?: BattingStats;
  pitching?: PitchingStats;
  fielding?: FieldingStats[];
  statcast?: StatcastAggregates;
}

// ============================================================================
// Games Collection
// ============================================================================

export interface TeamGameInfo {
  teamId: string;
  name: string;
  score: number;
  hits: number;
  errors: number;
}

export interface GamePitchers {
  starter: string;
  winner?: string;
  loser?: string;
  save?: string;
}

export interface GameUmpires {
  home?: string;
  first?: string;
  second?: string;
  third?: string;
  left?: string;
  right?: string;
}

export interface Game {
  gameId: string;             // Retrosheet format: TEAMYYYYMMDD#
  date: Date;
  season: number;
  gameType: string;           // R, WC, DS, CS, WS, AS
  gameNumber: number;         // For doubleheaders
  venue: {
    venueId: string;
    name: string;
  };
  home: TeamGameInfo;
  away: TeamGameInfo;
  linescore: {
    home: (number | string)[];
    away: (number | string)[];
  };
  homePitchers: GamePitchers;
  awayPitchers: GamePitchers;
  umpires: GameUmpires;
  attendance?: number;
  duration?: number;          // minutes
  dayNight: 'D' | 'N';
  hasStatcast: boolean;
  hasPlayByPlay: boolean;
}

// ============================================================================
// Pitches Collection (Statcast)
// ============================================================================

export interface PitchParticipant {
  playerId: number;           // MLBAM ID
  name: string;
  side: 'R' | 'L' | 'B';      // throws for pitcher, stands for batter (B = switch)
}

export interface PitchMovement {
  horizontal: number;         // pfx_x (inches)
  vertical: number;           // pfx_z (inches)
}

export interface PitchLocation {
  x: number;                  // plate_x
  z: number;                  // plate_z
}

export interface PitchData {
  type: string;               // FF, SL, CH, CU, SI, etc.
  speed: number;              // mph
  spinRate?: number;          // rpm
  extension?: number;         // feet
  movement: PitchMovement;
  location: PitchLocation;
  zone?: number;
}

export interface BattedBallLocation {
  x: number;                  // hc_x
  y: number;                  // hc_y
}

export interface BattedBall {
  exitVelocity: number;
  launchAngle: number;
  distance?: number;
  location: BattedBallLocation;
  type: string;               // fly_ball, ground_ball, line_drive, popup
  outcome: string;            // single, double, home_run, field_out, etc.
  expectedAvg?: number;
  expectedSlg?: number;
}

export interface Count {
  balls: number;
  strikes: number;
  outs: number;
}

export interface Pitch {
  gameId: string;
  season: number;
  date: Date;
  inning: number;
  halfInning: 'top' | 'bottom';
  atBatNumber: number;
  pitchNumber: number;
  pitcher: PitchParticipant;
  batter: PitchParticipant;
  pitch: PitchData;
  count: Count;
  result: {
    type: string;             // ball, strike, foul, hit, out
    description: string;      // called_strike, swinging_strike, etc.
  };
  batted?: BattedBall;        // Only if ball in play
}

// ============================================================================
// Plays Collection (Retrosheet)
// ============================================================================

export interface PlayEvent {
  code: string;               // Raw Retrosheet code
  type: string;               // Parsed event type
  description?: string;
}

export interface RunnerAdvance {
  runnerId: string;
  from: string;               // 1, 2, 3, B
  to: string;                 // 1, 2, 3, H, out
  isScored: boolean;
  isOut: boolean;
}

export interface Play {
  gameId: string;
  season: number;
  inning: number;
  halfInning: 'top' | 'bottom';
  playNumber: number;
  batterId: string;
  pitcherId: string;
  count: {
    balls: number;
    strikes: number;
  };
  pitchSequence?: string;
  event: PlayEvent;
  runnersOn: {
    first?: string;
    second?: string;
    third?: string;
  };
  advances: RunnerAdvance[];
  rbi: number;
  outsRecorded: number;
}

// ============================================================================
// Teams Collection
// ============================================================================

export interface TeamHistory {
  startYear: number;
  endYear?: number;
  name: string;
  city: string;
  league: string;
  division?: string;
}

export interface TeamVenue {
  venueId: string;
  startYear: number;
  endYear?: number;
}

export interface Team {
  teamId: string;
  currentName: string;
  currentCity: string;
  currentLeague: string;
  currentDivision: string;
  history: TeamHistory[];
  venues: TeamVenue[];
}

// ============================================================================
// Venues Collection
// ============================================================================

export interface Venue {
  venueId: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  opened?: Date;
  closed?: Date;
  capacity?: number;
  surface?: string;
  roof?: string;
}

// ============================================================================
// Rosters Collection
// ============================================================================

export interface RosterPlayer {
  playerId: string;
  name: PlayerName;
  position: string;
  bats: 'R' | 'L' | 'B';
  throws: 'R' | 'L' | 'B';
}

export interface Roster {
  teamId: string;
  season: number;
  players: RosterPlayer[];
}

// ============================================================================
// Transactions Collection
// ============================================================================

export type TransactionType =
  | 'trade'
  | 'signing'
  | 'release'
  | 'waiver'
  | 'draft'
  | 'assignment';

export interface Transaction {
  date: Date;
  season: number;
  type: TransactionType;
  playerId: string;
  playerName: string;
  fromTeam?: string;
  toTeam?: string;
  details?: string;
}

// ============================================================================
// Ejections Collection
// ============================================================================

export interface Ejection {
  gameId: string;
  date: Date;
  season: number;
  ejectee: {
    playerId: string;
    name: string;
    role: 'player' | 'manager' | 'coach';
    teamId: string;
  };
  umpire: {
    umpireId: string;
    name: string;
  };
  inning?: number;
  reason?: string;
}

// ============================================================================
// Collection Names
// ============================================================================

export const COLLECTIONS = {
  PLAYERS: 'players',
  PLAYER_SEASONS: 'playerSeasons',
  GAMES: 'games',
  PITCHES: 'pitches',
  PLAYS: 'plays',
  TEAMS: 'teams',
  VENUES: 'venues',
  ROSTERS: 'rosters',
  TRANSACTIONS: 'transactions',
  EJECTIONS: 'ejections',
} as const;
