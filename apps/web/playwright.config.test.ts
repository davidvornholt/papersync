import { afterEach, expect, it } from 'bun:test';
// biome-ignore lint/correctness/noNodejsModules: This test restores the disposable process environment used by the browser server.
import process from 'node:process';
import { Effect } from 'effect';
import defaultConfig from './playwright.config';
import managedConfig from './playwright-managed.config';
import {
  getVertexConfiguration,
  hasVertexConfiguration,
} from './src/shared/ocr/services/vision-vertex-config';

const vertexKeys = [
  'GOOGLE_VERTEX_PROJECT',
  'GOOGLE_VERTEX_LOCATION',
  'GOOGLE_VERTEX_CREDENTIALS_JSON',
] as const;
const originalEnvironment = vertexKeys.map((key) => process.env[key]);

afterEach(() => {
  vertexKeys.forEach((key, index) => {
    const value = originalEnvironment[index];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
});

it('keeps browser OCR fixtures isolated from host and dotenv Vertex values', () => {
  expect(defaultConfig.webServer?.env).toMatchObject({
    GOOGLE_VERTEX_PROJECT: '',
    GOOGLE_VERTEX_LOCATION: '',
    GOOGLE_VERTEX_CREDENTIALS_JSON: '',
  });
  expect(managedConfig.webServer?.env).toMatchObject({
    GOOGLE_VERTEX_PROJECT: 'browser-fixture-project',
    GOOGLE_VERTEX_LOCATION: '',
    GOOGLE_VERTEX_CREDENTIALS_JSON: '',
  });

  process.env.GOOGLE_VERTEX_PROJECT = '';
  process.env.GOOGLE_VERTEX_LOCATION = '';
  process.env.GOOGLE_VERTEX_CREDENTIALS_JSON = '';
  expect(hasVertexConfiguration()).toBe(false);

  process.env.GOOGLE_VERTEX_PROJECT = ' \t';
  expect(hasVertexConfiguration()).toBe(false);

  process.env.GOOGLE_VERTEX_PROJECT = 'host-project';
  expect(hasVertexConfiguration()).toBe(true);
  expect(Effect.runSync(Effect.either(getVertexConfiguration()))._tag).toBe(
    'Left',
  );
});
