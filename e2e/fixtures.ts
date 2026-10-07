import { test as base, expect } from '@playwright/test';

/** Block third-party requests (hot-linked photos, map embeds) so tests are hermetic. */
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    await page.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));
    await use(page);
  },
});
export { expect };
