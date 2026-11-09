import { Config, ConfigProvider, Effect, Option, Redacted } from 'effect';

const claudeApiKeyConfig = Config.option(Config.Redacted('ANTHROPIC_API_KEY'));
// Effect's default config provider keeps the environment it saw first. Read
// the current environment on every call, so the AI choice follows it.
const readClaudeApiKey = Effect.suspend(() =>
  claudeApiKeyConfig.parse(ConfigProvider.fromEnv()),
);

export const getClaudeApiKey = (): Option.Option<Redacted.Redacted<string>> =>
  Effect.runSync(readClaudeApiKey).pipe(
    Option.filter((apiKey) => Redacted.value(apiKey).trim().length > 0),
  );

export const hasClaudeConfiguration = (): boolean =>
  Option.isSome(getClaudeApiKey());
