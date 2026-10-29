const sqlite3 = require('sqlite3');

// Fixture helpers: build a Chrome-style Cookies database for the unit tests.
const EXPIRES_UTC = 13344473600000000; // Chromium timestamp for 2023-11-14T22:13:20Z (unix 1700000000)

const createCookiesDb = (file, cookieRows) =>
  new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file);
    db.serialize(() => {
      db.run(
        'CREATE TABLE cookies (host_key TEXT, path TEXT, is_secure INTEGER, expires_utc INTEGER, name TEXT, value TEXT, encrypted_value BLOB, creation_utc INTEGER, is_httponly INTEGER, has_expires INTEGER, is_persistent INTEGER)',
      );
      const insert = db.prepare('INSERT INTO cookies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)');
      cookieRows.forEach(([hostKey, cookiePath, isSecure, isHttpOnly, name, value, encryptedValue], index) => {
        insert.run(
          hostKey,
          cookiePath,
          isSecure,
          EXPIRES_UTC,
          name,
          value,
          encryptedValue || Buffer.alloc(0),
          index + 1,
          isHttpOnly,
        );
      });
      insert.finalize();
    });
    db.close((err) => (err ? reject(err) : resolve()));
  });

module.exports = { createCookiesDb };
