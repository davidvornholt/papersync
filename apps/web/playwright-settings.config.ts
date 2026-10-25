import config from './playwright.config';

// biome-ignore lint/style/noDefaultExport: Playwright requires a default configuration export.
export default {
  ...config,
  testMatch: /settings\.integration\.ts/u,
  // The scenarios share one database row, so they run one after another.
  workers: 1,
  projects: [
    { name: 'settings-chromium', use: { browserName: 'chromium' as const } },
  ],
};
