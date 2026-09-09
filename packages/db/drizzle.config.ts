import { defineConfig } from 'drizzle-kit';
import { Config, Effect, Redacted } from 'effect';
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: Redacted.value(Effect.runSync(Config.redacted('DATABASE_URL'))),
  },
});
