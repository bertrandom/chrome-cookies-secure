import 'mocha';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium } from '@playwright/test';
import chromeCookies from '../index.js';

const COOKIE_NAME = 'test_secure_cookie';
const COOKIE_VALUE = 'super-secret-123';

// A dummy domain that satisfies tld.getDomain() perfectly
const FAKE_URL = 'https://www.testcookies.com';

describe('chrome-cookies-secure E2E Tests', function () {
  // Keep Mocha above Playwright's launch timeout so we see browser errors, not a generic Mocha timeout.
  this.timeout(process.platform === 'win32' ? 45000 : 10000);

  let userDataDir;

  before(function () {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-e2e-'));
  });

  after(function () {
    if (userDataDir && fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });

  it('should write a cookie via Chrome and decrypt it via the package', async () => {
    // Playwright defaults to --use-mock-keychain and --password-store=basic.
    // On macOS this package decrypts via the real "Chrome Safe Storage" keychain entry, so we must opt out.
    // On Linux the package always derives the key from the hardcoded basic-store password, so keep Playwright's defaults.
    // On Windows use the runner/system Chrome (DPAPI + this profile's Local State). Playwright's
    // bundled Chromium often hangs on launch under GitHub windows-latest.
    const launchOptions = {
      headless: true,
      timeout: 30000,
      ...(process.platform === 'darwin'
        ? {
            channel: 'chrome',
            ignoreDefaultArgs: ['--use-mock-keychain', '--password-store=basic'],
          }
        : {}),
      ...(process.platform === 'win32'
        ? {
            channel: 'chrome',
            args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check'],
          }
        : {}),
    };

    const context = await chromium.launchPersistentContext(userDataDir, launchOptions);

    try {
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

      await page.goto(FAKE_URL, { timeout: 15000 });
    } finally {
      // Always close so the Cookies SQLite DB is flushed / unlocked
      await context.close();
    }

    const cookies = await chromeCookies.getCookiesPromised(
      FAKE_URL,
      'object',
      path.join(userDataDir, 'Default')
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
