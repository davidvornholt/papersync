import { createGoogleVertex } from '@ai-sdk/google-vertex/edge';
import { Effect } from 'effect';
import { GEMINI_MODEL } from './vision-contract';
import { createGeminiVisionProvider } from './vision-google-provider';
import { getVertexConfiguration } from './vision-vertex-config';

export const getVertexVisionProvider = () =>
  Effect.gen(function* () {
    const configuration = yield* getVertexConfiguration();
    const vertex = createGoogleVertex({
      project: configuration.project,
      location: configuration.location,
      apiKey: '',
      googleCredentials: {
        clientEmail: configuration.credentials.clientEmail,
        privateKey: configuration.credentials.privateKey,
      },
    });
    return createGeminiVisionProvider(vertex(GEMINI_MODEL));
  });
