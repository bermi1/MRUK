import { expect, test } from './fixtures';

test('ticket creation', async ({ page }) => {
  await page.goto('/mruk/support');
  await page.getByRole('radio', { name: 'Warranty claim' }).click();
  await page.locator('input[name=name]').fill('Hamisi Juma');
  await page.locator('input[name=phone]').fill('0786021993');
  await page.locator('textarea[name=description]').fill('Generator stops after two hours of running.');
  await page.getByRole('button', { name: /AI quick fixes/ }).click();
  await expect(page.getByText(/order number or receipt/)).toBeVisible();
  await page.getByTestId('send-ticket').click();
  await expect(page.getByTestId('ticket-number')).toHaveText(/TK-\d+/);
});

test('order tracking', async ({ page }) => {
  await page.goto('/mruk/track');
  // The order number alone shows nothing: it also needs the last 4 digits of the order's phone.
  await page.goto('/mruk/track?o=MU-10482');
  await expect(page.getByTestId('track-result')).toHaveCount(0);
  await page.getByTestId('track-input').fill('mu-10482');
  await page.getByTestId('track-phone').fill('0554');
  await page.getByRole('button', { name: 'Track' }).click();
  await expect(page.getByTestId('track-status')).toHaveText('Out for delivery');
  await expect(page.getByTestId('track-result')).toContainText('+255 777 ••• 554');
  await expect(page.getByTestId('track-result')).toContainText('Estimated delivery');
  // Wrong digits and unknown numbers get the same neutral message.
  await page.getByTestId('track-input').fill('MU-10482');
  await page.getByTestId('track-phone').fill('1234');
  await page.getByRole('button', { name: 'Track' }).click();
  await expect(page.getByTestId('track-result')).toHaveCount(0);
  await expect(page.getByText('We could not find that order')).toBeVisible();
  await page.getByTestId('track-input').fill('MU-1');
  await page.getByTestId('track-phone').fill('0554');
  await page.getByRole('button', { name: 'Track' }).click();
  await expect(page.getByText('We could not find that order')).toBeVisible();
});

test('AI compare answers only from catalogue data', async ({ page }) => {
  await page.goto('/mruk/compare');
  await page.getByTestId('run-verdict').click();
  await expect(page.getByTestId('verdict-pick')).toBeVisible();
  await expect(page.getByTestId('verdict')).toContainText('Best value');
  await page.getByTestId('ai-question').fill('Can it make coffee?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByTestId('ai-answer')).toContainText("doesn't cover that");
  await page.getByRole('button', { name: 'Which is best value?' }).click();
  await expect(page.getByTestId('ai-answer')).toContainText('Best value');
});
