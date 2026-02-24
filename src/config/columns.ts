/**
 * CSV Column Mappings
 *
 * Single source of truth for column names in source CSV files.
 * These are the ACTUAL headers from Retrosheet/Lahman files.
 *
 * IMPORTANT: When a loader fails to find data, check these mappings
 * against the actual file headers using: head -1 <file.csv>
 */

/**
 * Retrosheet ballparks0.csv columns
 * Source: https://www.retrosheet.org/downloads/biodata.zip
 */
export const BALLPARKS_COLUMNS = {
  venueId: 'site',
  name: 'name',
  city: 'city',
  state: 'state',
  firstGame: 'first_g',  // YYYYMMDD format
  lastGame: 'last_g',    // YYYYMMDD format
} as const;

/**
 * Retrosheet ejections.csv columns
 * Source: https://www.retrosheet.org/ejections.zip
 */
export const EJECTIONS_COLUMNS = {
  gameId: 'GAMEID',
  date: 'DATE',           // MM/DD/YYYY format
  doubleheader: 'DH',
  ejecteeId: 'EJECTEE',
  ejecteeName: 'EJECTEENAME',
  team: 'TEAM',
  job: 'JOB',             // P=player, M=manager, C=coach
  umpireId: 'UMPIRE',
  umpireName: 'UMPIRENAME',
  inning: 'INNING',
  reason: 'REASON',
} as const;

/**
 * Retrosheet biofile0.csv columns
 * Source: https://www.retrosheet.org/downloads/biodata.zip
 */
export const BIOFILE_COLUMNS = {
  id: 'id',
  lastName: 'lastname',
  useName: 'usename',
  fullName: 'fullname',
  birthDate: 'birthdate',
  birthCity: 'birthcity',
  birthState: 'birthstate',
  birthCountry: 'birthcountry',
  deathDate: 'deathdate',
  deathCity: 'deathcity',
  deathState: 'deathstate',
  deathCountry: 'deathcountry',
  bats: 'bats',
  throws: 'throws',
  height: 'height',
  weight: 'weight',
  hallOfFame: 'HOF',
} as const;

/**
 * Retrosheet teams0.csv columns
 * Source: https://www.retrosheet.org/downloads/biodata.zip
 */
export const TEAMS_COLUMNS = {
  teamId: 'team',
  city: 'city',
  nickname: 'nickname',
  firstGame: 'first_g',
  lastGame: 'last_g',
} as const;

/**
 * Chadwick Register columns
 * Source: https://github.com/chadwickbureau/register
 */
export const CHADWICK_COLUMNS = {
  retrosheetId: 'key_retro',
  mlbamId: 'key_mlbam',
  bbrefId: 'key_bbref',
  fangraphsId: 'key_fangraphs',
  lastName: 'name_last',
  firstName: 'name_first',
  givenName: 'name_given',
  birthYear: 'birth_year',
  birthMonth: 'birth_month',
  birthDay: 'birth_day',
  birthCity: 'birth_city',
  birthState: 'birth_state',
  birthCountry: 'birth_country',
  deathYear: 'death_year',
  deathMonth: 'death_month',
  deathDay: 'death_day',
  mlbPlayedFirst: 'mlb_played_first',
  mlbPlayedLast: 'mlb_played_last',
} as const;

/**
 * Helper to get value from row using column mapping
 */
export function getColumn(obj: Record<string, string>, column: string): string {
  return obj[column] || '';
}

/**
 * Validate that expected columns exist in headers
 */
export function validateColumns(
  headers: string[],
  expectedColumns: Record<string, string>,
  fileName: string
): void {
  const headerSet = new Set(headers);
  const missing: string[] = [];

  for (const [key, column] of Object.entries(expectedColumns)) {
    if (!headerSet.has(column)) {
      missing.push(`${key} (expected: '${column}')`);
    }
  }

  if (missing.length > 0) {
    console.warn(`Warning: ${fileName} missing columns: ${missing.join(', ')}`);
    console.warn(`Available columns: ${headers.join(', ')}`);
  }
}
