const { defineConfig, devices } = await import('@playwright/test');

export default defineConfig({
  testDir: './a11y',
  testMatch: /.*\.a11y\.ts/u,
  fullyParallel: true,
  forbidOnly: true,
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
