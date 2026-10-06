const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:8000',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' },
  },
  webServer: {
    command: 'npm run serve',
    port: 8000,
    reuseExistingServer: true,
  },
});
