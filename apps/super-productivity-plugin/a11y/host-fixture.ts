// biome-ignore lint/correctness/noNodejsModules: Playwright runs in Node and reads the built plugin archive.
import { readFile } from 'node:fs/promises';

import { strFromU8, unzipSync } from 'fflate';
import type { PluginApi, TaskInput } from '../src/api';

type Page = import('@playwright/test').Page;

type Host = Window & {
  // biome-ignore lint/style/useNamingConvention: Super Productivity exposes this exact global name.
  PluginAPI: PluginApi;
  plugin: { onUnload: () => void };
  imported: Array<TaskInput>;
  acknowledgements: Array<unknown>;
};
export const openImport = async (
  page: Page,
  subjects = ['Math', 'English', 'Science'],
  tags = [
    { id: 'math', title: ' math ' },
    { id: 'english', title: 'English' },
  ],
) => {
  await page.route('http://localhost/plugin-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html></html>',
    }),
  );
  await page.goto('http://localhost/plugin-fixture');
  await page.setContent(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>PaperSync import fixture</title><style>
    body { font: 16px system-ui; color: #202124; background: #fafafa; }
    dialog { width: 520px; max-width: calc(100% - 64px); border: 1px solid #777; border-radius: 8px; padding: 24px; }
    select, button { font: inherit; } button { min-height: 44px; padding: 8px 16px; margin: 16px 8px 0 0; }
  </style></head><body><main><h1>Homework</h1></main><p role="status"></p></body></html>`);
  await page.evaluate(
    ({ subjects: names, tags: availableTags }) => {
      const host = globalThis as unknown as Host;
      host.imported = [];
      host.acknowledgements = [];
      host.plugin = { onUnload: () => undefined };
      host.PluginAPI = {
        getAllProjects: async () => [{ id: 'school', title: 'School' }],
        getAllTags: async () => availableTags,
        getTasks: async () => [],
        getArchivedTasks: async () => [],
        getSecret: async () => 'demo-key',
        setSecret: async () => undefined,
        addTask: (task) => {
          host.imported.push(task);
          return Promise.resolve(`task-${host.imported.length}`);
        },
        updateTask: async () => undefined,
        request: (_url, options) => {
          if (options.method === 'POST') {
            host.acknowledgements.push(options.body);
            return Promise.resolve({ ok: true });
          }
          return Promise.resolve(
            names.map((subject, index) => ({
              payload: {
                id: `homework-${index}`,
                week: '2026-W38',
                day: 'Monday',
                subject,
                content: `Worksheet ${index + 1}`,
              },
              revision: 'demo',
            })),
          );
        },
        showSnack: ({ msg }) => {
          const status = document.querySelector('[role=status]');
          if (status) {
            status.textContent = msg;
          }
        },
        registerHeaderButton: ({ label, onClick }) => {
          const button = document.createElement('button');
          button.textContent = label;
          button.onclick = onClick;
          document.querySelector('main')?.append(button);
        },
        registerConfigHandler: () => undefined,
        openDialog: ({ title, htmlContent, buttons }) =>
          new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            const heading = document.createElement('h2');
            heading.id = 'dialog-title';
            heading.textContent = title;
            dialog.append(heading);
            const content = document.createElement('div');
            content.innerHTML = htmlContent;
            dialog.append(content);
            for (const action of buttons) {
              const button = document.createElement('button');
              button.textContent = action.label;
              button.onclick = () => {
                action.onClick?.();
                dialog.close();
                dialog.remove();
                resolve(action.label);
              };
              dialog.append(button);
            }
            dialog.oncancel = () => {
              dialog.remove();
              resolve(undefined);
            };
            document.body.append(dialog);
            dialog.showModal();
          }),
      };
    },
    { subjects, tags },
  );
  const archive = unzipSync(
    await readFile(new URL('../dist/papersync-plugin.zip', import.meta.url)),
  );
  const bundle = archive['plugin.js'];
  if (!bundle) {
    throw new Error('The plugin archive has no plugin.js.');
  }
  await page.addScriptTag({ content: strFromU8(bundle) });
  await page
    .getByRole('button', { name: 'Import homework', exact: true })
    .click();
};
export const importedTags = (page: Page) =>
  page.evaluate(() =>
    (globalThis as unknown as Host).imported.map((task) => task.tagIds),
  );
export const acknowledgementCount = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as Host).acknowledgements.length);
