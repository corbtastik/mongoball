/**
 * MongoDB Collection Names
 */

export const COLLECTIONS = {
  // Core collections (Retrosheet + Statcast)
  PLAYERS: 'players',
  PLAYER_SEASONS: 'playerSeasons',
  GAMES: 'games',
  PITCHES: 'pitches',
  PLAYS: 'plays',
  TEAMS: 'teams',
  VENUES: 'venues',
  ROSTERS: 'rosters',
  EJECTIONS: 'ejections',

  // Lahman collections (historical stats, awards, HOF)
  HALL_OF_FAME: 'hallOfFame',
  AWARDS: 'awards',
  AWARD_SHARES: 'awardShares',
  SALARIES: 'salaries',
  SCHOOLS: 'schools',
  COLLEGE_PLAYING: 'collegePlaying',
  ALL_STAR_APPEARANCES: 'allStarAppearances',
  MANAGERS: 'managers',
  LAHMAN_BATTING: 'lahmanBatting',
  LAHMAN_PITCHING: 'lahmanPitching',
} as const;
