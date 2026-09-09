import { createA11yPlaywrightConfig } from '@davidvornholt/a11y-testing/playwright-config';
import { browserAuth } from './a11y/auth-fixture';

const webServerCommand = 'bun run start --hostname 127.0.0.1 --port 3100';
export default {
  ...createA11yPlaywrightConfig({
    baseUrl: browserAuth.baseUrl,
    webServerCommand,
  }),
  testIgnore: /managed\.a11y\.ts/u,
  webServer: {
    command: webServerCommand,
    url: `${browserAuth.baseUrl}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      BETTER_AUTH_URL: browserAuth.baseUrl,
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      BETTER_AUTH_SECRET: browserAuth.secret,
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GITHUB_CLIENT_ID: 'browser-test-client',
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GITHUB_CLIENT_SECRET: 'browser-test-client-secret',
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GITHUB_ALLOWED_ACCOUNT_ID: browserAuth.accountId,
      // Empty values prevent host credentials and Next.js dotenv files from
      // selecting a paid provider in the local fixture suite.
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GOOGLE_VERTEX_PROJECT: '',
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GOOGLE_VERTEX_LOCATION: '',
      // biome-ignore lint/style/useNamingConvention: Runtime environment variable name.
      GOOGLE_VERTEX_CREDENTIALS_JSON: '',
    },
  },
};
