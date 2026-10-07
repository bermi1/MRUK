import { expect, test } from './fixtures';

test('browse → buy in full with card', async ({ page }) => {
  await page.goto('/skywood');
  await page.getByRole('link', { name: /Kitchen Appliances/ }).first().click();
  await expect(page).toHaveURL(/\/skywood\/c\/kitchen/);
  await page.goto('/skywood/p/skywood-sk-20s03');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('2.2L Electric Kettle');
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/skywood\/cart/);
  await expect(page.getByTestId('cart-line')).toHaveCount(1);
  await page.getByTestId('go-checkout').click();
  await page.locator('input[name=name]').fill('Juma Test');
  await page.locator('input[name=phone]').fill('0754111222');
  await page.getByTestId('pay-card').click();
  await page.getByTestId('consent').check();
  await page.getByTestId('place-order').click();
  await expect(page).toHaveURL(/\/pay\/SW-/);
  // Declined test card first, then the approved one.
  await page.locator('input[name=cardNumber]').fill('4000 0000 0000 0002');
  await page.locator('input[name=expiry]').fill('12/29');
  await page.locator('input[name=cvc]').fill('123');
  await page.getByTestId('pay-submit').click();
  await expect(page.locator('.err')).toContainText('declined');
  await page.locator('input[name=cardNumber]').fill('4242 4242 4242 4242');
  await page.getByTestId('pay-submit').click();
  await expect(page).toHaveURL(/\/skywood\/order\/SW-/);
  await expect(page.getByRole('heading', { name: /Order confirmed/ })).toBeVisible();
});
