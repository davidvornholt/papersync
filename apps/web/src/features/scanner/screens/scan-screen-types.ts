export type ResultsPanelState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error';

export const SCAN_DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
