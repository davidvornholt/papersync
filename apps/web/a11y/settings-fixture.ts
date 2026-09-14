import { test as base } from '@playwright/test';

// Existing UI scenarios isolate their school settings from the database.
// settings.a11y.ts exercises the real API across independent browser contexts.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/api/settings', (route) =>
      route.fulfill({ json: { revision: null, school: null } }),
    );
    await use(context);
  },
});
