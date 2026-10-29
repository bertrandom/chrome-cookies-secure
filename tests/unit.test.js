const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const chrome = require('../index');
const { createCookiesDb } = require('./sqlite');

// Runs against a fixture Cookies database, so no browser is needed.
// Key derivation still goes through the platform (keychain / DPAPI); on Linux the key is fixed, which is what CI uses.
const isLinux = process.platform === 'linux';

const url = 'https://www.example.com/';

const rows = [
  // host_key, path, is_secure, is_httponly, name, value, encrypted_value
  ['.example.com', '/', 0, 0, 'plain', 'p1', null],
  ['.example.com', '/', 1, 1, 'secure_only', 's1', null],
  ['.example.com', '/account', 0, 0, 'account', 'acc', null],
  ['notexample.com', '/', 0, 0, 'lookalike', 'x', null],
];

// Linux Chrome "v10" encryption: AES-128-CBC, key from the fixed password 'peanuts',
// plaintext prefixed with the SHA-256 of host_key (Chrome 130+)
const encryptLinuxV10 = (hostKey, value) => {
  const key = crypto.pbkdf2Sync('peanuts', 'saltysalt', 1, 16, 'sha1');
  const cipher = crypto.createCipheriv('aes-128-cbc', key, Buffer.alloc(16, ' '));
  const plaintext = Buffer.concat([crypto.createHash('sha256').update(hostKey).digest(), Buffer.from(value)]);
  return Buffer.concat([Buffer.from('v10'), cipher.update(plaintext), cipher.final()]);
};

describe('chrome-cookies-secure unit tests', function() {
  let profileDir;
  let cookiesPath;

  before(async function() {
    profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cookies-secure-'));
    cookiesPath = path.join(profileDir, 'Cookies');
    await createCookiesDb(cookiesPath, rows);
  });

  after(function() {
    fs.rmSync(profileDir, { recursive: true, force: true });
  });

  it('returns cookies for the domain as an object, excluding lookalike domains', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'object', cookiesPath);
    assert.deepStrictEqual(cookies, { plain: 'p1', secure_only: 's1' });
  });

  it('excludes secure cookies for http urls', async () => {
    const cookies = await chrome.getCookiesPromised('http://www.example.com/', 'object', cookiesPath);
    assert.deepStrictEqual(cookies, { plain: 'p1' });
  });

  it('includes path-scoped cookies only under their path', async () => {
    const cookies = await chrome.getCookiesPromised('https://www.example.com/account/settings', 'header', cookiesPath);
    assert.strictEqual(cookies, 'account=acc; plain=p1; secure_only=s1');
  });

  it('accepts a profile directory instead of the Cookies file', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'object', profileDir);
    assert.deepStrictEqual(cookies, { plain: 'p1', secure_only: 's1' });
  });

  it('returns a cookie header string', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'header', cookiesPath);
    assert.strictEqual(cookies, 'plain=p1; secure_only=s1');
  });

  it('returns Netscape cookie file lines for curl', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'curl', cookiesPath);
    const lines = cookies.split('\n').map((line) => line.split('\t').slice(0, 7));
    assert.deepStrictEqual(lines, [
      ['.example.com', 'TRUE', '/', 'FALSE', '1700000000', 'plain', 'p1'],
      ['.example.com', 'TRUE', '/', 'TRUE', '1700000000', 'secure_only', 's1'],
    ]);
  });

  it('returns set-cookie strings', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'set-cookie', cookiesPath);
    assert.deepStrictEqual(cookies, [
      'plain=p1; expires=Tue, 14 Nov 2023 22:13:20 GMT; domain=.example.com; path=/',
      'secure_only=s1; expires=Tue, 14 Nov 2023 22:13:20 GMT; domain=.example.com; path=/; Secure; HttpOnly',
    ]);
  });

  it('returns puppeteer cookie objects', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'puppeteer', cookiesPath);
    assert.deepStrictEqual(cookies.map(({ expires, ...cookie }) => cookie), [
      { name: 'plain', value: 'p1', domain: '.example.com', path: '/' },
      { name: 'secure_only', value: 's1', domain: '.example.com', path: '/', Secure: true, HttpOnly: true },
    ]);
  });

  it('returns a tough-cookie jar', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'jar', cookiesPath);
    assert.strictEqual(cookies._jar.getCookieStringSync(url), 'plain=p1; secure_only=s1');
  });

  it('supports the callback API', (done) => {
    chrome.getCookies(url, 'object', (err, cookies) => {
      assert.ifError(err);
      assert.deepStrictEqual(cookies, { plain: 'p1', secure_only: 's1' });
      done();
    }, cookiesPath);
  });

  it('rejects urls it cannot parse', async () => {
    await assert.rejects(chrome.getCookiesPromised('not a url', 'object', cookiesPath), /Could not parse URI/);
  });

  it('decrypts Linux v10 encrypted cookies', async function() {
    if (!isLinux) {
      this.skip();
    }

    const encryptedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cookies-secure-'));
    const encryptedPath = path.join(encryptedDir, 'Cookies');
    await createCookiesDb(encryptedPath, [
      ['.example.com', '/', 0, 0, 'encrypted', '', encryptLinuxV10('.example.com', 'secret-value')],
    ]);

    try {
      const cookies = await chrome.getCookiesPromised(url, 'object', encryptedPath);
      assert.deepStrictEqual(cookies, { encrypted: 'secret-value' });
    } finally {
      fs.rmSync(encryptedDir, { recursive: true, force: true });
    }
  });
});
