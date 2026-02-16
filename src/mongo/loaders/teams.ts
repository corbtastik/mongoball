/**
 * Teams Loader
 *
 * Loads team data from Retrosheet TEAM files.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getCollection } from '../connection.js';
import { COLLECTIONS, Team, TeamHistory } from '../schema.js';
import { parseCSVLine } from '../parsers.js';

// Known team relocations and name changes
const TEAM_HISTORY: Record<string, TeamHistory[]> = {
  HOU: [
    { startYear: 2013, name: 'Houston Astros', city: 'Houston', league: 'AL', division: 'West' },
    { startYear: 1965, endYear: 2012, name: 'Houston Astros', city: 'Houston', league: 'NL', division: 'Central' },
    { startYear: 1962, endYear: 1964, name: 'Houston Colt .45s', city: 'Houston', league: 'NL' },
  ],
  MIL: [
    { startYear: 1998, name: 'Milwaukee Brewers', city: 'Milwaukee', league: 'NL', division: 'Central' },
    { startYear: 1970, endYear: 1997, name: 'Milwaukee Brewers', city: 'Milwaukee', league: 'AL', division: 'Central' },
  ],
  WAS: [
    { startYear: 2005, name: 'Washington Nationals', city: 'Washington', league: 'NL', division: 'East' },
  ],
  MON: [
    { startYear: 1969, endYear: 2004, name: 'Montreal Expos', city: 'Montreal', league: 'NL', division: 'East' },
  ],
  TBA: [
    { startYear: 2008, name: 'Tampa Bay Rays', city: 'Tampa Bay', league: 'AL', division: 'East' },
    { startYear: 1998, endYear: 2007, name: 'Tampa Bay Devil Rays', city: 'Tampa Bay', league: 'AL', division: 'East' },
  ],
  FLO: [
    { startYear: 2012, name: 'Miami Marlins', city: 'Miami', league: 'NL', division: 'East' },
    { startYear: 1993, endYear: 2011, name: 'Florida Marlins', city: 'Miami', league: 'NL', division: 'East' },
  ],
  MIA: [
    { startYear: 2012, name: 'Miami Marlins', city: 'Miami', league: 'NL', division: 'East' },
  ],
  ANA: [
    { startYear: 2016, name: 'Los Angeles Angels', city: 'Anaheim', league: 'AL', division: 'West' },
    { startYear: 2005, endYear: 2015, name: 'Los Angeles Angels of Anaheim', city: 'Anaheim', league: 'AL', division: 'West' },
    { startYear: 1997, endYear: 2004, name: 'Anaheim Angels', city: 'Anaheim', league: 'AL', division: 'West' },
    { startYear: 1965, endYear: 1996, name: 'California Angels', city: 'Anaheim', league: 'AL', division: 'West' },
  ],
  LAA: [
    { startYear: 2005, name: 'Los Angeles Angels', city: 'Anaheim', league: 'AL', division: 'West' },
  ],
};

// Current team info (2024)
const CURRENT_TEAMS: Record<string, { name: string; city: string; league: string; division: string }> = {
  ARI: { name: 'Arizona Diamondbacks', city: 'Phoenix', league: 'NL', division: 'West' },
  ATL: { name: 'Atlanta Braves', city: 'Atlanta', league: 'NL', division: 'East' },
  BAL: { name: 'Baltimore Orioles', city: 'Baltimore', league: 'AL', division: 'East' },
  BOS: { name: 'Boston Red Sox', city: 'Boston', league: 'AL', division: 'East' },
  CHN: { name: 'Chicago Cubs', city: 'Chicago', league: 'NL', division: 'Central' },
  CHA: { name: 'Chicago White Sox', city: 'Chicago', league: 'AL', division: 'Central' },
  CIN: { name: 'Cincinnati Reds', city: 'Cincinnati', league: 'NL', division: 'Central' },
  CLE: { name: 'Cleveland Guardians', city: 'Cleveland', league: 'AL', division: 'Central' },
  COL: { name: 'Colorado Rockies', city: 'Denver', league: 'NL', division: 'West' },
  DET: { name: 'Detroit Tigers', city: 'Detroit', league: 'AL', division: 'Central' },
  HOU: { name: 'Houston Astros', city: 'Houston', league: 'AL', division: 'West' },
  KCA: { name: 'Kansas City Royals', city: 'Kansas City', league: 'AL', division: 'Central' },
  LAA: { name: 'Los Angeles Angels', city: 'Anaheim', league: 'AL', division: 'West' },
  LAN: { name: 'Los Angeles Dodgers', city: 'Los Angeles', league: 'NL', division: 'West' },
  MIA: { name: 'Miami Marlins', city: 'Miami', league: 'NL', division: 'East' },
  MIL: { name: 'Milwaukee Brewers', city: 'Milwaukee', league: 'NL', division: 'Central' },
  MIN: { name: 'Minnesota Twins', city: 'Minneapolis', league: 'AL', division: 'Central' },
  NYA: { name: 'New York Yankees', city: 'New York', league: 'AL', division: 'East' },
  NYN: { name: 'New York Mets', city: 'New York', league: 'NL', division: 'East' },
  OAK: { name: 'Oakland Athletics', city: 'Oakland', league: 'AL', division: 'West' },
  PHI: { name: 'Philadelphia Phillies', city: 'Philadelphia', league: 'NL', division: 'East' },
  PIT: { name: 'Pittsburgh Pirates', city: 'Pittsburgh', league: 'NL', division: 'Central' },
  SDN: { name: 'San Diego Padres', city: 'San Diego', league: 'NL', division: 'West' },
  SFN: { name: 'San Francisco Giants', city: 'San Francisco', league: 'NL', division: 'West' },
  SEA: { name: 'Seattle Mariners', city: 'Seattle', league: 'AL', division: 'West' },
  SLN: { name: 'St. Louis Cardinals', city: 'St. Louis', league: 'NL', division: 'Central' },
  TBA: { name: 'Tampa Bay Rays', city: 'Tampa Bay', league: 'AL', division: 'East' },
  TEX: { name: 'Texas Rangers', city: 'Arlington', league: 'AL', division: 'West' },
  TOR: { name: 'Toronto Blue Jays', city: 'Toronto', league: 'AL', division: 'East' },
  WAS: { name: 'Washington Nationals', city: 'Washington', league: 'NL', division: 'East' },
};

/**
 * Load teams from TEAM files and static data
 */
export async function loadTeams(dataDir: string): Promise<number> {
  console.log('Loading teams...');
  const collection = getCollection<Team>(COLLECTIONS.TEAMS);

  const teams: Team[] = [];

  // Build team documents from static data
  for (const [teamId, info] of Object.entries(CURRENT_TEAMS)) {
    const history = TEAM_HISTORY[teamId] || [
      {
        startYear: 1900,
        name: info.name,
        city: info.city,
        league: info.league,
        division: info.division,
      },
    ];

    teams.push({
      teamId,
      currentName: info.name,
      currentCity: info.city,
      currentLeague: info.league,
      currentDivision: info.division,
      history,
      venues: [], // Would need to populate from venue data
    });
  }

  // Also scan TEAM files for any additional teams
  const teamFiles = findTeamFiles(dataDir);
  for (const filePath of teamFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      const fields = parseCSVLine(line);
      if (fields.length < 4) continue;

      const teamId = fields[0];
      if (teams.find((t) => t.teamId === teamId)) continue;

      teams.push({
        teamId,
        currentName: fields[3],
        currentCity: fields[2],
        currentLeague: fields[1],
        currentDivision: '',
        history: [
          {
            startYear: 1900,
            name: fields[3],
            city: fields[2],
            league: fields[1],
          },
        ],
        venues: [],
      });
    }
  }

  if (teams.length > 0) {
    await collection.insertMany(teams, { ordered: false }).catch(() => {});
  }

  console.log(`  Loaded ${teams.length} teams`);
  return teams.length;
}

function findTeamFiles(dataDir: string): string[] {
  const files: string[] = [];

  const searchDir = (dir: string) => {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.match(/^TEAM\d{4}$/)) {
        files.push(join(dir, entry.name));
      } else if (entry.isDirectory()) {
        searchDir(join(dir, entry.name));
      }
    }
  };

  searchDir(dataDir);
  return files;
}
