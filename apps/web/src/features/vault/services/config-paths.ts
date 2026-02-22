import type { WeekId } from '@/shared/types';

export const PAPERSYNC_ROOT = 'PaperSync';
export const CONFIG_DIR = '.papersync';
export const CONFIG_FILE = 'config.json';
export const SUBJECTS_FILE = 'subjects.json';
export const TIMETABLE_FILE = 'timetable.json';
export const WEEKLY_DIR = 'Weekly';
export const OVERVIEW_FILE = 'Overview.md';

export const getConfigPath = (): string =>
  `${PAPERSYNC_ROOT}/${CONFIG_DIR}/${CONFIG_FILE}`;

export const getSubjectsPath = (): string =>
  `${PAPERSYNC_ROOT}/${CONFIG_DIR}/${SUBJECTS_FILE}`;

export const getTimetablePath = (): string =>
  `${PAPERSYNC_ROOT}/${CONFIG_DIR}/${TIMETABLE_FILE}`;

export const getWeeklyNotePath = (weekId: WeekId): string =>
  `${PAPERSYNC_ROOT}/${WEEKLY_DIR}/${weekId}.md`;

export const getOverviewPath = (): string => `${OVERVIEW_FILE}`;
