const { test } = require('@playwright/test');

const APP_URL = process.env.APP_URL || 'https://app.politogyvrm.com';
const LOGIN_URL = `${APP_URL}/login`;
const TASKS_URL = `${APP_URL}/relationship/roadmap/tasks`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const SCREEN_DIR = process.env.SCREEN_DIR || '/Users/spencerhill/Desktop/politogy-task-email-2026-04-01';

test.describe('Politogy task discovery', () => {
  test.setTimeout(180_000);

  test('opens the live create-task form and prints accessible controls', async ({ page }) => {
    if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
      throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD are required');
    }

    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Enter your email').fill(TEST_USER_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/app\.politogyvrm\.com\/relationship\//, { timeout: 60_000 });

    await page.goto(TASKS_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Task menu' }).click();
    await page.getByRole('button', { name: 'Create Task' }).click();
    await page.waitForTimeout(2_000);

    await page.screenshot({
      path: `${SCREEN_DIR}/01-task-form-discovery.png`,
      fullPage: true,
    });

    const controls = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('input, textarea, select, button, [role="combobox"], [role="textbox"]')
      );

      const labelFor = (element) => {
        const attr =
          element.getAttribute('aria-label') ||
          element.getAttribute('placeholder') ||
          element.getAttribute('name') ||
          '';
        if (attr) return attr;

        const id = element.getAttribute('id');
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label?.textContent?.trim()) return label.textContent.trim();
        }

        const parentLabel = element.closest('label');
        if (parentLabel?.textContent?.trim()) return parentLabel.textContent.trim();

        return element.textContent?.trim() || '';
      };

      return nodes
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || '',
          role: element.getAttribute('role') || '',
          label: labelFor(element),
          text: element.textContent?.trim() || '',
        }))
        .filter((item) => item.label || item.text);
    });

    console.log(JSON.stringify(controls, null, 2));
  });
});
