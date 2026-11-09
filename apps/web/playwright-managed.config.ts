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
      // A made-up key turns on managed AI but can't authenticate to the Claude API.
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      ANTHROPIC_API_KEY: 'inert-browser-fixture-key',
    },
  },
};
