import { afterEach, expect, it } from 'bun:test';
// biome-ignore lint/correctness/noNodejsModules: This test restores the disposable process environment used by the browser server.
import process from 'node:process';
import { Effect } from 'effect';
import defaultConfig from './playwright.config';
import managedConfig from './playwright-managed.config';
import {
  getBedrockConfiguration,
  hasBedrockConfiguration,
} from './src/shared/ocr/services/vision-bedrock-config';

const bedrockKeys = [
  'BEDROCK_REGION',
  'BEDROCK_ACCESS_KEY_ID',
  'BEDROCK_SECRET_ACCESS_KEY',
] as const;
const originalEnvironment = bedrockKeys.map((key) => process.env[key]);

afterEach(() => {
  bedrockKeys.forEach((key, index) => {
    const value = originalEnvironment[index];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
});

it('keeps browser OCR fixtures isolated from host and dotenv Bedrock values', () => {
  expect(bedrockKeys.map((key) => defaultConfig.webServer?.env?.[key])).toEqual(
    ['', '', ''],
  );
  expect(bedrockKeys.map((key) => managedConfig.webServer?.env?.[key])).toEqual(
    ['eu-central-1', '', ''],
  );

  process.env.BEDROCK_REGION = '';
  process.env.BEDROCK_ACCESS_KEY_ID = '';
  process.env.BEDROCK_SECRET_ACCESS_KEY = '';
  expect(hasBedrockConfiguration()).toBe(false);

  process.env.BEDROCK_REGION = ' \t';
  expect(hasBedrockConfiguration()).toBe(false);

  process.env.BEDROCK_REGION = 'eu-central-1';
  expect(hasBedrockConfiguration()).toBe(true);
  expect(Effect.runSync(Effect.result(getBedrockConfiguration()))._tag).toBe(
    'Failure',
  );
});
