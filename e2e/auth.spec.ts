import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow a user to sign in with dev credentials', async ({ page }) => {
    // Go to sign-in page
    await page.goto('/sign-in');

    // Check heading
    await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();

    // Fill credentials
    await page.fill('#sign-in-email', 'dev@qacopilot.local');
    await page.fill('#sign-in-password', 'Password123!');

    // Click submit
    await page.click('button[type="submit"]');

    // Expect redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify hero or navigation links
    await expect(page.locator('nav.app-nav')).toBeVisible();
    await expect(page.locator('text=Active Workspace')).toBeVisible();
  });
});
