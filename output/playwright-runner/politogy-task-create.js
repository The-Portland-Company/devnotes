const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('@playwright/test');

const APP_URL = process.env.APP_URL || 'https://app.politogyvrm.com';
const LOGIN_URL = `${APP_URL}/login`;
const TASKS_URL = `${APP_URL}/relationship/roadmap/tasks`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const SCREEN_DIR = process.env.SCREEN_DIR || '/Users/spencerhill/Desktop/politogy-task-email-2026-04-01';

function isTaskCreateUrl(url) {
  return url.includes('/api/devnotes/tasks') || url.includes('/api/devnotes/reports');
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function saveScreenshot(page, filename) {
  const target = path.join(SCREEN_DIR, filename);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function ensureTaskCreationEnabled(page) {
  const enabled = page.locator('button[aria-label="Click to disable task creation"]');
  if (await enabled.count()) {
    return 'already-enabled';
  }

  await page.locator('button[aria-label="Task menu"]').click();
  await page.getByRole('button', { name: 'Create Task' }).click();
  await page.waitForSelector('button[aria-label="Click to disable task creation"]', {
    timeout: 15_000,
  });
  return 'enabled-via-menu';
}

async function waitForTasksUi(page) {
  await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 });
  await page
    .locator('button[aria-label="Task menu"], button[aria-label="Click to disable task creation"]')
    .first()
    .waitFor({ state: 'visible', timeout: 60_000 });
}

async function placePendingTaskPin(page) {
  const main = page.locator('main');
  const box = await main.boundingBox();
  if (!box) {
    throw new Error('Could not read main canvas bounds');
  }

  const x = Math.round(box.x + box.width * 0.48);
  const y = Math.round(box.y + box.height * 0.52);
  await page.mouse.click(x, y);
  await page.waitForTimeout(1_000);
}

async function main() {
  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD are required');
  }

  await fs.mkdir(SCREEN_DIR, { recursive: true });

  const runStamp = stamp();
  const title = `Codex email trigger verification ${runStamp}`;
  const description = [
    `Created on ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}.`,
    'Purpose: verify Politogy DevNotes task-created email notifications to the configured project owner recipients.',
    'Flow executed through the live app.politogyvrm.com roadmap tasks interface.',
  ].join(' ');
  const expected = 'Creating a task should return 200 from /api/devnotes/reports and send the owner notification email.';
  const actual = 'Verification run initiated by Codex via Playwright.';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const page = await context.newPage();
  const debug = {
    console: [],
    pageErrors: [],
    requestFailures: [],
    reportRequests: [],
    pageClosed: false,
    browserDisconnected: false,
  };

  page.on('console', (message) => {
    debug.console.push({
      type: message.type(),
      text: message.text(),
    });
  });
  page.on('pageerror', (error) => {
    debug.pageErrors.push({
      message: error.message,
      stack: error.stack || null,
    });
  });
  page.on('requestfailed', (request) => {
    debug.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
    });
  });
  page.on('response', async (response) => {
    if (!isTaskCreateUrl(response.url())) {
      return;
    }

    let bodyText = null;
    try {
      bodyText = await response.text();
    } catch {
      bodyText = null;
    }

    debug.reportRequests.push({
      url: response.url(),
      method: response.request().method(),
      status: response.status(),
      bodyText,
    });
  });
  page.on('close', () => {
    debug.pageClosed = true;
  });
  browser.on('disconnected', () => {
    debug.browserDisconnected = true;
  });

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Enter your email').fill(TEST_USER_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_USER_PASSWORD);
    await saveScreenshot(page, '01-login.png');

    await Promise.all([
      page.waitForURL(/app\.politogyvrm\.com\/relationship\//, { timeout: 60_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ]);

    await page.goto(TASKS_URL, { waitUntil: 'domcontentloaded' });
    await waitForTasksUi(page);
    await saveScreenshot(page, '02-tasks-page.png');

    const creationMode = await ensureTaskCreationEnabled(page);
    await page.waitForFunction(() => document.body.style.cursor === 'crosshair', null, {
      timeout: 15_000,
    });
    await page.waitForTimeout(750);
    await saveScreenshot(page, '03-task-creation-enabled.png');

    await placePendingTaskPin(page);
    await page.waitForSelector('[data-pending-dot]', { timeout: 15_000 });
    await saveScreenshot(page, '04-pending-pin.png');

    await page.locator('[data-pending-dot]').click();
    await page.waitForSelector('[data-bug-form]', { timeout: 15_000 });
    const form = page.locator('[data-bug-form]');
    await saveScreenshot(page, '05-task-form-open.png');

    await form.locator('input[placeholder="Brief description of the issue"]').fill(title);
    await form.locator('textarea[placeholder="Detailed description (optional)"]').fill(description);
    await form.locator('textarea[placeholder="What should have happened?"]').fill(expected);
    await form.locator('textarea[placeholder="What actually happened?"]').fill(actual);
    await saveScreenshot(page, '06-task-form-filled.png');

    const statusInput = form.locator('input[placeholder="Type to search..."]').last();
    await statusInput.fill('Open');
    await statusInput.press('Enter');
    await page.waitForFunction(
      () =>
        Array.from(
          document.querySelectorAll('[data-bug-form] button[aria-label="Save"]')
        ).some((button) => !(button instanceof HTMLButtonElement) ? false : !button.disabled),
      null,
      { timeout: 15_000 }
    );
    await saveScreenshot(page, '07-status-selected.png');

    const saveButton = form.locator('button[aria-label="Save"]').first();
    await saveButton.waitFor({ state: 'visible', timeout: 15_000 });
    await saveButton.scrollIntoViewIfNeeded();

    let createResponse;
    try {
      [createResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            isTaskCreateUrl(response.url()) &&
            response.request().method() === 'POST',
          { timeout: 60_000 }
        ),
        saveButton.click(),
      ]);
    } catch (error) {
      await saveScreenshot(page, '08-save-attempt-failed.png').catch(() => {});
      const debugPath = path.join(SCREEN_DIR, 'task-create-debug.json');
      await fs.writeFile(
        debugPath,
        `${JSON.stringify(
          {
            runStamp,
            title,
            creationMode,
            error: {
              message: error.message,
              stack: error.stack || null,
            },
            debug,
          },
          null,
          2
        )}\n`
      );
      throw error;
    }

    await saveScreenshot(page, '08-save-clicked.png');
    const createBodyText = await createResponse.text();
    let createBody;
    try {
      createBody = JSON.parse(createBodyText);
    } catch {
      createBody = createBodyText;
    }

    if (!createResponse.ok()) {
      throw new Error(`Task create failed: ${createResponse.status()} ${createBodyText}`);
    }

    const payload = {
      runStamp,
      title,
      creationMode,
      createStatus: createResponse.status(),
      createBody,
      debug,
    };

    const reportPath = path.join(SCREEN_DIR, 'task-create-response.json');
    await fs.writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`);

    await page.waitForSelector('[data-bug-form]', { state: 'hidden', timeout: 30_000 });
    await page
      .locator('input[placeholder="Search by title, description, or page URL..."]')
      .first()
      .fill(title);
    await page.waitForTimeout(2_500);
    await saveScreenshot(page, '09-created-task-filtered.png');

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
