import { test, expect } from '@playwright/test';

test.describe('Projects Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in and sign in before each test
    await page.goto('/sign-in');
    await page.fill('#sign-in-email', 'dev@qacopilot.local');
    await page.fill('#sign-in-password', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should allow creating a project and showing it in the list', async ({ page }) => {
    // Navigate to Projects page
    await page.click('a:has-text("Projects")');
    await expect(page).toHaveURL(/\/projects/);

    // Enter project details in the form
    const projectName = `E2E Test Project ${Date.now()}`;
    const projectDesc = 'A project created by automated E2E tests';

    await page.fill('#project-name', projectName);
    await page.fill('#project-description', projectDesc);

    // Submit form
    await page.click('button:has-text("Create Project")');

    // Expect success message
    await expect(page.locator(`text=Project "${projectName}" created.`)).toBeVisible();

    // Verify it appears in the active project picker or sidebar
    const sidebar = page.locator('aside.sidebar');
    await expect(sidebar.locator(`text=${projectName}`)).toBeVisible();
  });
});
