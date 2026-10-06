const { test, expect } = require('@playwright/test');

test('loads without JavaScript errors and applies filters once', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#query').fill('cloud setup');
  await page.locator('#siteFilter').selectOption('github.com');
  await page.locator('#fileTypeFilter').selectOption('pdf');
  await page.locator('#siteFilter').selectOption('stackoverflow.com');
  await expect(page.locator('#query')).toHaveValue('cloud setup filetype:pdf site:stackoverflow.com');
  expect(errors).toEqual([]);
});

test('supports custom filters and clearing them', async ({ page }) => {
  await page.goto('/');
  await page.locator('#query').fill('release notes');
  await page.locator('#siteFilter').selectOption('custom');
  await page.locator('#customSite').fill('example.com');
  await page.locator('#customSite').blur();
  await expect(page.locator('#query')).toHaveValue('release notes site:example.com');
  await page.locator('#clearSite').click();
  await expect(page.locator('#query')).toHaveValue('release notes');
});

test('groups Google-indexable file types and replaces the active type', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#fileTypeFilter optgroup')).toHaveCount(6);
  await expect(page.locator('#fileTypeFilter optgroup').first()).toHaveAttribute('label', 'Documents and text');
  await expect(page.locator('#fileTypeFilter option[value="mp4"]')).toHaveCount(0);
  await expect(page.locator('#fileTypeFilter option[value="zip"]')).toHaveCount(0);
  await expect(page.locator('#fileTypeFilter option[value="custom"]')).toHaveCount(0);
  await page.locator('#query').fill('developer guide');
  await page.locator('#fileTypeFilter').selectOption('docx');
  await expect(page.locator('#query')).toHaveValue('developer guide filetype:docx');
  await page.locator('#fileTypeFilter').selectOption('xml');
  await expect(page.locator('#query')).toHaveValue('developer guide filetype:xml');
});

test('quotes selected text and creates the expected search URL', async ({ page, context }) => {
  let destination = '';
  await context.route('https://www.google.com/search?*', async (route) => {
    destination = route.request().url();
    await route.fulfill({ status: 200, body: 'Search captured' });
  });
  await page.goto('/');
  await page.locator('#query').fill('cloud setup');
  await page.locator('#query').evaluate((input) => input.setSelectionRange(0, 5));
  await page.getByRole('button', { name: 'Exact phrase' }).click();
  await expect(page.locator('#query')).toHaveValue('"cloud" setup');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Search in new tab' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(destination).toBe('https://www.google.com/search?q=%22cloud%22%20setup');
});

test('fits the search controls on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const box = await page.locator('.search-container').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.locator('#fileTypeFilter').click();
  await expect(page.locator('#fullscreen-content')).toHaveCount(0);
  await page.keyboard.press('Escape');
});

test('hides the cursor only after inactivity in fullscreen', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(5100);
  await expect(page.locator('body')).not.toHaveClass(/cursor-hidden/);
  await page.locator('#invisible-footer').click({ position: { x: 10, y: 190 } });
  await page.clock.fastForward(5100);
  await expect(page.locator('body')).toHaveClass(/cursor-hidden/);
  await page.mouse.move(10, 10);
  await expect(page.locator('body')).not.toHaveClass(/cursor-hidden/);
});

test('keeps the invisible footer as the fullscreen trigger', async ({ page }) => {
  await page.goto('/');
  await page.locator('#invisible-footer').click({ position: { x: 10, y: 190 } });
  await expect(page.locator('#fullscreen-content')).toBeVisible();
  await page.locator('#fullscreen-content').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('#fullscreen-content')).toHaveCount(0);
});
