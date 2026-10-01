import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { Effect, Redacted } from 'effect';
import { getBedrockConfiguration } from './vision-bedrock-config';
import { createClaudeVisionProvider } from './vision-claude-provider';

export const getBedrockVisionProvider = () =>
  Effect.gen(function* () {
    const configuration = yield* getBedrockConfiguration();
    const client = new BedrockRuntimeClient({
      region: configuration.region,
      endpoint: `https://bedrock-runtime.${configuration.region}.amazonaws.com`,
      credentials: {
        accessKeyId: Redacted.value(configuration.accessKeyId),
        secretAccessKey: Redacted.value(configuration.secretAccessKey),
      },
      // Dedicated credentials and SigV4 selection isolate production requests
      // from ambient AWS bearer tokens, profiles, and session credentials.
      authSchemePreference: ['aws.auth#sigv4'],
      requestHandler: new FetchHttpHandler(),
    });
    return createClaudeVisionProvider(client);
  });
