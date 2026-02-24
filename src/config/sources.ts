/**
 * Mongoball Data Sources Configuration
 *
 * This file centralizes all external data source URLs and their metadata.
 * Each source is documented with what it provides and which MongoDB
 * collections it populates.
 *
 * To modify data sources, edit this file only.
 */

// =============================================================================
// DATA SOURCE DEFINITIONS
// =============================================================================

/**
 * Retrosheet - Historical play-by-play baseball data
 *
 * Website: https://www.retrosheet.org
 * Data: Game logs, event files, rosters, schedules (1871-present)
 * License: Free for non-commercial use with attribution
 */
export const RETROSHEET = {
  name: 'Retrosheet',
  baseUrl: 'https://www.retrosheet.org',
  website: 'https://www.retrosheet.org',

  // Season-specific data (requires year parameter)
  season: {
    gameLogs: (year: number) => `https://www.retrosheet.org/gamelogs/gl${year}.zip`,
    events: (year: number) => `https://www.retrosheet.org/events/${year}eve.zip`,
    boxScores: (year: number) => `https://www.retrosheet.org/events/${year}box.zip`,
    postseason: (year: number) => `https://www.retrosheet.org/events/${year}post.zip`,
    allStar: (year: number) => `https://www.retrosheet.org/events/${year}as.zip`,
    schedule: (year: number) => `https://www.retrosheet.org/schedule/${year}SKED.zip`,
  },

  // Reference data (downloaded once, shared across seasons)
  reference: {
    biodata: 'https://www.retrosheet.org/downloads/biodata.zip',
    ejections: 'https://www.retrosheet.org/ejections.zip',
  },

  // What each download contains
  contents: {
    gameLogs: ['gl{YEAR}.txt'],
    events: ['{YEAR}*.EVA', '{YEAR}*.EVN', '*{YEAR}.ROS', 'TEAM{YEAR}'],
    boxScores: ['{YEAR}.EBA', '{YEAR}.EBN'],
    postseason: ['{YEAR}*.EVE'],
    allStar: ['{YEAR}AS.EVA', '{YEAR}AS.EVN'],
    schedule: ['{YEAR}SKED.TXT'],
    biodata: [
      'ballparks0.csv',
      'biofile0.csv',
      'coaches0.csv',
      'managers0.csv',
      'relatives.csv',
      'teams0.csv',
      'umpires0.csv',
    ],
    ejections: ['ejections.csv'],
  },

  // Maps to MongoDB collections
  collections: {
    gameLogs: ['games'],
    events: ['plays', 'rosters'],
    boxScores: ['games'],
    biodata: ['players', 'venues', 'teams'],
    ejections: ['ejections'],
  },
} as const;

/**
 * Baseball Savant - MLB Statcast pitch tracking data
 *
 * Website: https://baseballsavant.mlb.com
 * Data: Pitch-by-pitch tracking data with spin, velocity, location (2015-present)
 * License: Public data, no authentication required
 */
export const STATCAST = {
  name: 'Baseball Savant (Statcast)',
  baseUrl: 'https://baseballsavant.mlb.com/statcast_search/csv',
  website: 'https://baseballsavant.mlb.com',

  // API endpoint for CSV export
  searchUrl: 'https://baseballsavant.mlb.com/statcast_search/csv',

  // Data availability
  firstYear: 2015,

  // Query parameters
  defaultParams: {
    all: 'true',
    type: 'details',
    player_type: 'pitcher',
  },

  // Batting leaderboards (aggregated season stats)
  leaderboards: {
    batting: {
      batTracking: (year: number) =>
        `https://baseballsavant.mlb.com/leaderboard/bat-tracking?year=${year}&min=1&csv=true`,
      expectedStats: (year: number) =>
        `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=batter&year=${year}&min=1&csv=true`,
      exitVeloBarrels: (year: number) =>
        `https://baseballsavant.mlb.com/leaderboard/statcast?type=batter&year=${year}&min=1&csv=true`,
      battedBallProfile: (year: number) =>
        `https://baseballsavant.mlb.com/leaderboard/percentage-balls-in-play?year=${year}&min=1&csv=true`,
      sprintSpeed: (year: number) =>
        `https://baseballsavant.mlb.com/leaderboard/sprint_speed?year=${year}&min=1&csv=true`,
      runValue: (year: number) =>
        `https://baseballsavant.mlb.com/leaderboard/running_value?year=${year}&min=1&csv=true`,
    },
  },

  // Output filenames for leaderboards
  leaderboardFiles: {
    batTracking: 'bat_tracking.csv',
    expectedStats: 'expected_stats_batting.csv',
    exitVeloBarrels: 'exit_velo_barrels.csv',
    battedBallProfile: 'batted_ball_profile.csv',
    sprintSpeed: 'sprint_speed.csv',
    runValue: 'batting_run_value.csv',
  },

  // Maps to MongoDB collections
  collections: ['pitches'],
} as const;

/**
 * Chadwick Bureau - Player ID crosswalk registry
 *
 * Website: https://github.com/chadwickbureau/register
 * Data: Maps player IDs across systems (Retrosheet, MLBAM, Baseball-Reference, etc.)
 * License: Open Data Commons Open Database License (ODbL)
 */
export const CHADWICK = {
  name: 'Chadwick Bureau Register',
  baseUrl: 'https://raw.githubusercontent.com/chadwickbureau/register/master/data',
  website: 'https://github.com/chadwickbureau/register',

  // The register is split into 16 files by first character of ID
  files: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'].map(
    (c) => `https://raw.githubusercontent.com/chadwickbureau/register/master/data/people-${c}.csv`
  ),

  // Output filename when combined
  outputFile: 'chadwick_register.csv',

  // Key fields for ID mapping
  idFields: {
    retrosheet: 'key_retro',
    mlbam: 'key_mlbam',
    bbref: 'key_bbref',
    fangraphs: 'key_fangraphs',
  },

  // Maps to MongoDB collections
  collections: ['players'],
} as const;

/**
 * Lahman Baseball Database
 *
 * Original source: https://sabr.org/lahman-database/
 * Hosted at: https://github.com/corbtastik/lahman-baseball-db
 * Data: Historical statistics, awards, Hall of Fame, salaries (1871-present)
 * License: Creative Commons Attribution-ShareAlike 3.0
 */
export const LAHMAN = {
  name: 'Lahman Baseball Database',
  baseUrl: 'https://raw.githubusercontent.com/corbtastik/lahman-baseball-db/main',
  website: 'https://github.com/corbtastik/lahman-baseball-db',
  originalSource: 'https://sabr.org/lahman-database/',

  // Files we load into MongoDB (subset of full database)
  files: {
    // Player biographical data
    people: 'People.csv',

    // Awards and recognition
    hallOfFame: 'HallOfFame.csv',
    awardsPlayers: 'AwardsPlayers.csv',
    awardsManagers: 'AwardsManagers.csv',
    awardsSharePlayers: 'AwardsSharePlayers.csv',
    awardsShareManagers: 'AwardsShareManagers.csv',
    allStarFull: 'AllstarFull.csv',

    // Career/season data
    salaries: 'Salaries.csv',
    collegePlaying: 'CollegePlaying.csv',
    schools: 'Schools.csv',
    managers: 'Managers.csv',

    // Season statistics (may overlap with Retrosheet)
    batting: 'Batting.csv',
    pitching: 'Pitching.csv',

    // Venues (fallback if Retrosheet ballparks unavailable)
    parks: 'Parks.csv',
  },

  // Files available but NOT currently loaded (to avoid duplication with Retrosheet)
  availableButNotLoaded: [
    'Appearances.csv',
    'Fielding.csv',
    'FieldingOF.csv',
    'FieldingOFsplit.csv',
    'FieldingPost.csv',
    'BattingPost.csv',
    'PitchingPost.csv',
    'Teams.csv',
    'TeamsFranchises.csv',
    'TeamsHalf.csv',
    'ManagersHalf.csv',
    'HomeGames.csv',
    'SeriesPost.csv',
  ],

  // Maps to MongoDB collections
  collections: [
    'hallOfFame',
    'awards',
    'awardShares',
    'salaries',
    'schools',
    'collegePlaying',
    'allStarAppearances',
    'managers',
  ],
} as const;

// =============================================================================
// SOURCE GROUPS
// =============================================================================

/**
 * Sources downloaded by default (no flags required)
 */
export const DEFAULT_SOURCES = {
  season: ['retrosheet', 'statcast'] as const,
  reference: ['chadwick'] as const,
};

/**
 * Sources requiring explicit opt-in
 */
export const OPTIONAL_SOURCES = {
  reference: ['retrosheet-biodata', 'retrosheet-ejections', 'lahman'] as const,
};

// =============================================================================
// COLLECTION MAPPING
// =============================================================================

/**
 * Maps MongoDB collections to their data sources
 * Used to understand where collection data comes from
 */
export const COLLECTION_SOURCES: Record<string, { source: string; file: string; required: boolean }[]> = {
  // Core collections
  players: [
    { source: 'chadwick', file: 'chadwick_register.csv', required: true },
    { source: 'retrosheet-biodata', file: 'biofile0.csv', required: false },
    { source: 'lahman', file: 'People.csv', required: false },
  ],
  games: [
    { source: 'retrosheet-season', file: 'gl{YEAR}.txt', required: true },
  ],
  pitches: [
    { source: 'statcast', file: '{YEAR}_statcast.csv', required: true },
  ],
  rosters: [
    { source: 'retrosheet-season', file: '*{YEAR}.ROS', required: true },
  ],
  teams: [
    { source: 'retrosheet-season', file: 'TEAM{YEAR}', required: true },
    { source: 'retrosheet-biodata', file: 'teams0.csv', required: false },
  ],
  venues: [
    { source: 'retrosheet-biodata', file: 'ballparks0.csv', required: true },
    { source: 'lahman', file: 'Parks.csv', required: false },
  ],
  ejections: [
    { source: 'retrosheet-ejections', file: 'ejections.csv', required: true },
  ],

  // Lahman-specific collections
  hallOfFame: [
    { source: 'lahman', file: 'HallOfFame.csv', required: true },
  ],
  awards: [
    { source: 'lahman', file: 'AwardsPlayers.csv', required: true },
    { source: 'lahman', file: 'AwardsManagers.csv', required: true },
  ],
  awardShares: [
    { source: 'lahman', file: 'AwardsSharePlayers.csv', required: true },
    { source: 'lahman', file: 'AwardsShareManagers.csv', required: true },
  ],
  salaries: [
    { source: 'lahman', file: 'Salaries.csv', required: true },
  ],
  schools: [
    { source: 'lahman', file: 'Schools.csv', required: true },
  ],
  collegePlaying: [
    { source: 'lahman', file: 'CollegePlaying.csv', required: true },
  ],
  allStarAppearances: [
    { source: 'lahman', file: 'AllstarFull.csv', required: true },
  ],
  managers: [
    { source: 'lahman', file: 'Managers.csv', required: true },
  ],

  // Play-by-play from Retrosheet event files
  plays: [
    { source: 'retrosheet-season', file: '{YEAR}*.EVA, {YEAR}*.EVN', required: true },
  ],
  playerSeasons: [
    { source: 'lahman', file: 'Batting.csv, Pitching.csv', required: false },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all source URLs for a given season year
 */
export function getSeasonUrls(year: number) {
  return {
    retrosheet: {
      gameLogs: RETROSHEET.season.gameLogs(year),
      events: RETROSHEET.season.events(year),
      boxScores: RETROSHEET.season.boxScores(year),
      postseason: RETROSHEET.season.postseason(year),
      allStar: RETROSHEET.season.allStar(year),
      schedule: RETROSHEET.season.schedule(year),
    },
    statcast: {
      available: year >= STATCAST.firstYear,
      searchUrl: STATCAST.searchUrl,
    },
  };
}

/**
 * Get reference data URLs (not season-specific)
 */
export function getReferenceUrls() {
  return {
    chadwick: CHADWICK.files,
    retrosheet: {
      biodata: RETROSHEET.reference.biodata,
      ejections: RETROSHEET.reference.ejections,
    },
    lahman: {
      baseUrl: LAHMAN.baseUrl,
      website: LAHMAN.website,
      files: Object.values(LAHMAN.files).map((f) => `${LAHMAN.baseUrl}/${f}`),
    },
  };
}

/**
 * Print data source documentation
 */
export function printSourceDocs(): void {
  console.log('');
  console.log('='.repeat(70));
  console.log('MONGOBALL DATA SOURCES');
  console.log('='.repeat(70));
  console.log('');

  console.log('1. RETROSHEET (https://www.retrosheet.org)');
  console.log('   Historical play-by-play baseball data (1871-present)');
  console.log('   Season data: game logs, events, rosters, schedules');
  console.log('   Reference:   ballparks, players, coaches, umpires, ejections');
  console.log('');

  console.log('2. BASEBALL SAVANT (https://baseballsavant.mlb.com)');
  console.log('   MLB Statcast pitch tracking data (2015-present)');
  console.log('   Pitch velocity, spin, location, exit velocity');
  console.log('');

  console.log('3. CHADWICK BUREAU (https://github.com/chadwickbureau/register)');
  console.log('   Player ID crosswalk registry');
  console.log('   Links Retrosheet, MLBAM, Baseball-Reference, Fangraphs IDs');
  console.log('');

  console.log('4. LAHMAN DATABASE (https://github.com/corbtastik/lahman-baseball-db)');
  console.log('   Historical statistics, awards, Hall of Fame, salaries');
  console.log('   Original source: https://sabr.org/lahman-database/');
  console.log('');

  console.log('='.repeat(70));
}
