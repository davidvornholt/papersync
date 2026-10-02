import config from './playwright.config';

// These scenarios share the real server's two-analysis limit and hold model
// responses open. Run them one at a time across desktop and mobile so another
// scenario cannot consume the capacity needed by the current test.
// biome-ignore lint/style/noDefaultExport: Playwright requires a default configuration export.
export default {
  ...config,
  testIgnore: [],
  testMatch: /scan(?:-background)?\.a11y\.ts$/u,
  fullyParallel: false,
  workers: 1,
};
