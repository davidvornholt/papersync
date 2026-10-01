import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { Effect, Redacted } from 'effect';
import { getBedrockConfiguration } from './vision-bedrock-config';
import { createClaudeVisionProvider } from './vision-claude-provider';
import { CLAUDE_MODEL } from './vision-contract';

export const getBedrockVisionProvider = () =>
  Effect.gen(function* () {
    const configuration = yield* getBedrockConfiguration();
    const bedrock = createAmazonBedrock({
      region: configuration.region,
      accessKeyId: Redacted.value(configuration.accessKeyId),
      secretAccessKey: Redacted.value(configuration.secretAccessKey),
      // Always sign with PaperSync's dedicated identity, regardless of ambient
      // AWS bearer tokens or session credentials from the host environment.
      apiKey: '',
    });
    return createClaudeVisionProvider(bedrock(CLAUDE_MODEL));
  });
