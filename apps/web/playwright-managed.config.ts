import config from './playwright.config';

// biome-ignore lint/style/noDefaultExport: Playwright requires a default configuration export.
export default {
  ...config,
  testIgnore: [],
  testMatch: /managed\.a11y\.ts/u,
  webServer: {
    ...config.webServer,
    env: {
      ...config.webServer.env,
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GOOGLE_VERTEX_PROJECT: 'browser-fixture-project',
    },
  },
};
