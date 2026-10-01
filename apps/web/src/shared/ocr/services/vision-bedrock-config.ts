import { Config, Effect, Option, Redacted, Schema } from 'effect';
import { VisionError } from '@/shared/ocr/errors/vision-contract';

const bedrockEnvironment = Config.all({
  region: Config.option(Config.string('BEDROCK_REGION')),
  accessKeyId: Config.option(Config.redacted('BEDROCK_ACCESS_KEY_ID')),
  secretAccessKey: Config.option(Config.redacted('BEDROCK_SECRET_ACCESS_KEY')),
});
const regionSchema = Schema.String.pipe(
  Schema.pattern(/^[a-z]{2}(?:-[a-z]+)+-\d$/u),
);
const hasNonBlankValue = (
  value: Option.Option<string | Redacted.Redacted<string>>,
): boolean =>
  value.pipe(
    Option.exists(
      (candidate) =>
        (Redacted.isRedacted(candidate)
          ? Redacted.value(candidate)
          : candidate
        ).trim().length > 0,
    ),
  );

export const hasBedrockConfiguration = (): boolean =>
  Effect.runSync(
    bedrockEnvironment.pipe(
      Effect.map((values) => Object.values(values).some(hasNonBlankValue)),
    ),
  );

export const getBedrockConfiguration = () =>
  Effect.gen(function* () {
    const values = yield* bedrockEnvironment;
    const region = yield* Schema.decodeUnknown(regionSchema)(
      Option.getOrUndefined(values.region),
    );
    const accessKeyId = yield* values.accessKeyId;
    const secretAccessKey = yield* values.secretAccessKey;
    yield* Schema.decodeUnknown(Schema.NonEmptyTrimmedString)(
      Redacted.value(accessKeyId),
    );
    yield* Schema.decodeUnknown(Schema.NonEmptyTrimmedString)(
      Redacted.value(secretAccessKey),
    );
    return { region, accessKeyId, secretAccessKey };
  }).pipe(
    Effect.mapError(
      () =>
        new VisionError({
          message:
            'AWS Bedrock is not configured correctly. Ask the server administrator to check its region and dedicated access keys.',
        }),
    ),
  );
