import { afterEach, expect, it } from 'bun:test';
// biome-ignore lint/correctness/noNodejsModules: This test restores the disposable process environment used by the browser server.
import process from 'node:process';
import defaultConfig from './playwright.config';
import managedConfig from './playwright-managed.config';
import { hasClaudeConfiguration } from './src/shared/ocr/services/vision-claude-config';

const originalApiKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  }
});

it('keeps browser OCR fixtures isolated from a host or dotenv Claude API key', () => {
  expect(defaultConfig.webServer?.env?.ANTHROPIC_API_KEY).toBe('');
  expect(managedConfig.webServer?.env?.ANTHROPIC_API_KEY).toBe(
    'inert-browser-fixture-key',
  );

  process.env.ANTHROPIC_API_KEY = '';
  expect(hasClaudeConfiguration()).toBe(false);

  process.env.ANTHROPIC_API_KEY = ' \t';
  expect(hasClaudeConfiguration()).toBe(false);

  delete process.env.ANTHROPIC_API_KEY;
  expect(hasClaudeConfiguration()).toBe(false);

  process.env.ANTHROPIC_API_KEY = 'inert-browser-fixture-key';
  expect(hasClaudeConfiguration()).toBe(true);
});
