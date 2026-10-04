import {
  Config,
  ConfigProvider,
  Effect,
  Option,
  Redacted,
  Schema,
} from 'effect';
import { VisionError } from '@/shared/ocr/errors/vision-contract';
import { NonEmptyTrimmedString } from '@/shared/types/schemas';

const bedrockEnvironment = Config.all({
  region: Config.option(Config.String('BEDROCK_REGION')),
  accessKeyId: Config.option(Config.Redacted('BEDROCK_ACCESS_KEY_ID')),
  secretAccessKey: Config.option(Config.Redacted('BEDROCK_SECRET_ACCESS_KEY')),
});
// Effect's default config provider keeps the environment it saw first. Read
// the current environment on every call, so the AI choice follows it.
const readBedrockEnvironment = Effect.suspend(() =>
  bedrockEnvironment.parse(ConfigProvider.fromEnv()),
);
const regionSchema = Schema.String.check(
  Schema.isPattern(/^[a-z]{2}(?:-[a-z]+)+-\d$/u),
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
    readBedrockEnvironment.pipe(
      Effect.map((values) => Object.values(values).some(hasNonBlankValue)),
    ),
  );

export const getBedrockConfiguration = () =>
  Effect.gen(function* () {
    const values = yield* readBedrockEnvironment;
    const region = yield* Schema.decodeUnknownEffect(regionSchema)(
      Option.getOrUndefined(values.region),
    );
    const accessKeyId = yield* Effect.fromOption(values.accessKeyId);
    const secretAccessKey = yield* Effect.fromOption(values.secretAccessKey);
    yield* Schema.decodeUnknownEffect(NonEmptyTrimmedString)(
      Redacted.value(accessKeyId),
    );
    yield* Schema.decodeUnknownEffect(NonEmptyTrimmedString)(
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
