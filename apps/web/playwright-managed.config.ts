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
      // Keep the managed browser fixture unable to authenticate to Google Cloud.
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GOOGLE_VERTEX_LOCATION: '',
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GOOGLE_VERTEX_CREDENTIALS_JSON: '',
    },
  },
};
