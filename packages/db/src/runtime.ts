import { PgClient } from '@effect/sql-pg';
import { Config, ManagedRuntime } from 'effect';
export const databaseRuntime = ManagedRuntime.make(
  PgClient.layerConfig({
    url: Config.Redacted('DATABASE_URL'),
  }),
);
