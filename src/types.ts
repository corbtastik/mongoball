/**
 * Type definitions for MLB data download utilities
 */

export interface SeasonDates {
  regular: { start: string; end: string };
  postseason: { start: string; end: string };
}

export interface DownloadOptions {
  years: number[];
  outputDir: string;
  noStatcast: boolean;
  statcastOnly: boolean;
  noRetrosheet: boolean;
  crosswalkOnly: boolean;
  includeReference: boolean;
}

export interface DownloadResult {
  success: boolean;
  files: string[];
  errors: string[];
}

export interface StatcastPitch {
  pitch_type: string;
  game_date: string;
  release_speed: number;
  player_name: string;
  batter: number;
  pitcher: number;
  events: string;
  description: string;
  zone: number;
  stand: string;
  p_throws: string;
  home_team: string;
  away_team: string;
  balls: number;
  strikes: number;
  launch_speed?: number;
  launch_angle?: number;
  [key: string]: unknown;
}

// Season date ranges
export const SEASON_DATES: Record<number, SeasonDates> = {
  2015: {
    regular: { start: '2015-04-05', end: '2015-10-04' },
    postseason: { start: '2015-10-06', end: '2015-11-02' },
  },
  2016: {
    regular: { start: '2016-04-03', end: '2016-10-02' },
    postseason: { start: '2016-10-04', end: '2016-11-03' },
  },
  2017: {
    regular: { start: '2017-04-02', end: '2017-10-01' },
    postseason: { start: '2017-10-03', end: '2017-11-02' },
  },
  2018: {
    regular: { start: '2018-03-29', end: '2018-10-01' },
    postseason: { start: '2018-10-02', end: '2018-10-28' },
  },
  2019: {
    regular: { start: '2019-03-20', end: '2019-09-29' },
    postseason: { start: '2019-10-01', end: '2019-10-30' },
  },
  2020: {
    regular: { start: '2020-07-23', end: '2020-09-27' }, // COVID shortened
    postseason: { start: '2020-09-29', end: '2020-10-27' },
  },
  2021: {
    regular: { start: '2021-04-01', end: '2021-10-03' },
    postseason: { start: '2021-10-05', end: '2021-11-02' },
  },
  2022: {
    regular: { start: '2022-04-07', end: '2022-10-05' },
    postseason: { start: '2022-10-07', end: '2022-11-05' },
  },
  2023: {
    regular: { start: '2023-03-30', end: '2023-10-01' },
    postseason: { start: '2023-10-03', end: '2023-11-01' },
  },
  2024: {
    regular: { start: '2024-03-20', end: '2024-09-29' },
    postseason: { start: '2024-10-01', end: '2024-11-02' },
  },
  2025: {
    regular: { start: '2025-03-27', end: '2025-09-28' },
    postseason: { start: '2025-10-01', end: '2025-11-05' },
  },
};
