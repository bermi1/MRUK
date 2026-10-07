import { expect, test } from './fixtures';

async function toApplication(page: import('@playwright/test').Page) {
  await page.goto('/mruk/p/mruk-pump-control');
  await page.getByRole('button', { name: '6 months' }).click();
  await page.getByTestId('buy-now').click();
  await expect(page).toHaveURL(/\/mruk\/checkout/);
  await page.locator('input[name=name]').fill('Neema Mushi');
  await page.locator('input[name=phone]').fill('+255 754 000 214');
  await page.getByTestId('consent').check();
  await page.getByTestId('place-order').click();
  await page.locator('input[name=nida]').fill('19900101-12345-00001-23');
  await page.locator('input[name=employer]').fill('University of Dar es Salaam');
  await page.locator('input[name=checkNumber]').fill('100311');
  await page.locator('input[name=jobTitle]').fill('Lecturer');
  await page.locator('input[name=account]').fill('015022148821');
}

test('affordability blocks instalments above one third of salary', async ({ page }) => {
  await toApplication(page);
  await page.locator('input[name=salary]').fill('60000');
  await expect(page.getByTestId('affordability')).toHaveText('Above limit');
  await page.getByTestId('to-contract').click();
  await expect(page.getByText(/above the one-third limit/)).toBeVisible();
});

test('browse → Salary Advance → sign → confirm (contract PDF stored)', async ({ page }) => {
  await toApplication(page);
  await page.locator('input[name=salary]').fill('1800000');
  await expect(page.getByTestId('affordability')).toHaveText('Within limit');
  await page.getByTestId('to-contract').click();
  await expect(page.getByText('Instalment Sale and Salary Advance Agreement')).toBeVisible();
  await expect(page.locator('.schedule > div')).toHaveCount(6);
  await page.getByTestId('signature').fill('Neema Mushi');
  await page.getByTestId('consent-0').check();
  await page.getByTestId('consent-1').check();
  await page.getByTestId('sign-submit').click();
  await expect(page).toHaveURL(/\/mruk\/order\/MU-/, { timeout: 30_000 });
  await expect(page.getByText('In review')).toBeVisible();
  const href = await page.getByTestId('download-contract').getAttribute('href');
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('application/pdf');
  expect((await res.body()).subarray(0, 4).toString()).toBe('%PDF');
});
