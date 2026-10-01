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
      BEDROCK_REGION: 'eu-central-1',
      // Keep the managed browser fixture unable to authenticate to AWS Bedrock.
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      BEDROCK_ACCESS_KEY_ID: '',
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      BEDROCK_SECRET_ACCESS_KEY: '',
    },
  },
};
