import { Config, Effect, Option, Schema } from 'effect';
import { VisionError } from '@/shared/ocr/errors/vision-contract';

const CredentialsSchema = Schema.Struct({
  type: Schema.Literal('service_account'),
  clientEmail: Schema.propertySignature(Schema.NonEmptyTrimmedString).pipe(
    Schema.fromKey('client_email'),
  ),
  privateKey: Schema.propertySignature(Schema.NonEmptyString).pipe(
    Schema.fromKey('private_key'),
  ),
});
const ConfigurationSchema = Schema.Struct({
  project: Schema.String.pipe(
    Schema.pattern(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/u),
  ),
  location: Schema.Literal('global', 'eu', 'us'),
  credentials: Schema.parseJson(CredentialsSchema),
});
const vertexEnvironment = Config.all({
  project: Config.option(Config.string('GOOGLE_VERTEX_PROJECT')),
  location: Config.option(Config.string('GOOGLE_VERTEX_LOCATION')),
  credentials: Config.option(Config.string('GOOGLE_VERTEX_CREDENTIALS_JSON')),
});
const hasNonBlankValue = (value: Option.Option<string>): boolean =>
  value.pipe(Option.exists((candidate) => candidate.trim().length > 0));

export const hasVertexConfiguration = (): boolean =>
  Effect.runSync(
    vertexEnvironment.pipe(
      Effect.map((values) => Object.values(values).some(hasNonBlankValue)),
    ),
  );

export const getVertexConfiguration = () =>
  Effect.gen(function* () {
    const values = yield* vertexEnvironment;
    return yield* Schema.decodeUnknown(ConfigurationSchema)({
      project: Option.getOrUndefined(values.project),
      location: Option.getOrUndefined(values.location),
      credentials: Option.getOrUndefined(values.credentials),
    });
  }).pipe(
    Effect.mapError(
      () =>
        new VisionError({
          message:
            'Google Cloud AI is not configured correctly. Ask the server administrator to check its project, location, and service-account credentials.',
        }),
    ),
  );
