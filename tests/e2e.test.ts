import 'mocha';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import chromeCookies from '../index.js';

const COOKIE_NAME = 'test_secure_cookie';
const COOKIE_VALUE = 'super-secret-123';
const USER_DATA_DIR = path.join(process.cwd(), '.chrome-profile');

// A dummy domain that satisfies tld.getDomain() perfectly
const FAKE_URL = 'https://www.testcookies.com';

describe('chrome-cookies-secure E2E Tests', function () {
  this.timeout(10000);

  before(function () {
    // Drop any profile written with Playwright's mock keychain defaults
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  });

  it('should write a cookie via Chrome and decrypt it via the package', async () => {
    // Playwright defaults to --use-mock-keychain and --password-store=basic.
    // On macOS this package decrypts via the real "Chrome Safe Storage" keychain entry, so we must opt out.
    // On Linux the package always derives the key from the hardcoded basic-store password, so keep Playwright's defaults.
    // CHROME_PATH (CI) points at a system Chrome/Chromium install instead of Playwright's bundled browser.
    const launchOptions = {
      headless: true,
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : process.platform === 'darwin'
          ? {
              channel: 'chrome',
              ignoreDefaultArgs: ['--use-mock-keychain', '--password-store=basic'],
            }
          : {}),
    };

    const context = await chromium.launchPersistentContext(USER_DATA_DIR, launchOptions);

    const page = await context.newPage();

    // Intercept network requests to the fake domain entirely in-memory
    await page.route('**/*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          // Max-Age is required so Chromium persists the cookie to the Cookies SQLite DB.
          // Session cookies (no expiry) stay in-memory only and never appear in the DB.
          'Set-Cookie': `${COOKIE_NAME}=${COOKIE_VALUE}; Secure; HttpOnly; Path=/; Max-Age=3600`,
          'Content-Type': 'text/html',
        },
        body: '<h1>Mock Environment Loaded</h1>',
      });
    });

    await page.goto(FAKE_URL);

    // Close the context to force Chromium to flush the cookie SQLite DB to disk
    await context.close();

    const cookies = await chromeCookies.getCookiesPromised(
      FAKE_URL,
      'object',
      path.join(USER_DATA_DIR, 'Default')
    );

    console.log(cookies);

    assert.ok(cookies, 'Cookies object should be returned');
    assert.strictEqual(
      cookies[COOKIE_NAME],
      COOKIE_VALUE,
      `Expected cookie "${COOKIE_NAME}" to equal "${COOKIE_VALUE}"`
    );
  });
});
