import 'mocha';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium } from '@playwright/test';
import chromeCookies from '../index.js';

const COOKIE_NAME = 'test_secure_cookie';
const COOKIE_VALUE = 'super-secret-123';
const USER_DATA_DIR = path.join(process.cwd(), '.chrome-profile');

// A dummy domain that satisfies tld.getDomain() perfectly
const FAKE_URL = 'https://www.testcookies.com';

const log = (msg: string) => {
  console.log(`[e2e] ${msg}`);
};

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

describe('chrome-cookies-secure E2E Tests', function () {
  // Keep Mocha above Playwright's launch timeout so we see browser errors, not a generic Mocha timeout.
  this.timeout(process.platform === 'win32' ? 30000 : 10000);

  let userDataDir: string;

  before(function () {
    // Drop any profile written with Playwright's mock keychain defaults
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-e2e-'));
  });

  after(function () {
    if (userDataDir && fs.existsSync(userDataDir)) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (err) {
        // Windows may still hold SQLite locks briefly after Chromium exits.
        log(`cleanup warning: ${(err as Error).message}`);
      }
    }
  });

  it('should write a cookie via Chrome and decrypt it via the package', async () => {
    // Playwright defaults to --use-mock-keychain and --password-store=basic.
    // On macOS this package decrypts via the real "Chrome Safe Storage" keychain entry, so we must opt out.
    // On Linux the package always derives the key from the hardcoded basic-store password, so keep Playwright's defaults.
    // On Windows use Playwright's bundled Chromium (DPAPI + this profile's Local State). 
    // System Chrome via channel: 'chrome' hung silently on windows-latest without respecting Playwright's launch timeout.
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
            args: [
              '--disable-gpu',
              '--disable-extensions',
              '--disable-background-networking',
              '--disable-sync',
              '--disable-default-apps',
              '--no-first-run',
              '--no-default-browser-check',
            ],
          }
        : {}),
    };

    log(`launching persistent context (${process.platform}) dir=${userDataDir}`);
    const context = await withTimeout(
      chromium.launchPersistentContext(userDataDir, launchOptions),
      35000,
      'launchPersistentContext'
    );
    log('browser launched');

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

      log(`goto ${FAKE_URL}`);
      await page.goto(FAKE_URL, { timeout: 15000, waitUntil: 'domcontentloaded' });
      log('goto complete');
    } finally {
      log('closing browser');
      // Always close so the Cookies SQLite DB is flushed / unlocked
      await context.close();
      log('browser closed');
    }

    log('getting cookies');

    // Give the Windows Network Service time to release handles and flush WAL
    // Basic delay to test how long the lock might be.
    if (process.platform === 'win32') {
      await new Promise((resolve) => setTimeout(resolve, 10000));
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
