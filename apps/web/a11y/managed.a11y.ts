import { expect } from '@playwright/test';
import { defaultSettings } from '../src/shared/settings/schema';
import { createSessionCookies } from './auth-fixture';
import { scanWcag22AaViolations } from './axe';
import { test } from './settings-fixture';

test('managed AI hides browser credentials even with an old provider selection', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.addInitScript(
    (settings) =>
      localStorage.setItem('papersync-settings', JSON.stringify(settings)),
    {
      ...defaultSettings,
      ai: { provider: 'ollama', ollamaEndpoint: 'http://localhost:11434' },
    },
  );
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Gemini 3.8 Flash' }),
  ).toBeVisible();
  await expect(page.getByLabel('API key', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Ollama endpoint')).toHaveCount(0);
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});
