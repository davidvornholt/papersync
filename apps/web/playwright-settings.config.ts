import config from './playwright.config';

// One shared database row is exercised across browser contexts. Run this
// scenario once, after the isolated desktop and mobile UI suites.
// biome-ignore lint/style/noDefaultExport: Playwright requires a default configuration export.
export default {
  ...config,
  testMatch: /settings\.integration\.ts/u,
  projects: [
    { name: 'settings-chromium', use: { browserName: 'chromium' as const } },
  ],
};
