/*
 * Copyright (c) 2015, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the MIT License.
 * See the accompanying LICENSE file for terms.
 */

var sqlite3 = require('sqlite3'),
	tld = require('tldjs'),
	tough = require('tough-cookie'),
	request = require('request'),
	int = require('int'),
	url = require('url'),
	crypto = require('crypto'),
	fs = require('fs'),
	Cookie = tough.Cookie,
	userData,
	path,
	ITERATIONS,
	dbClosed = false;

if (process.platform === 'darwin') {
	userData = process.env.HOME + '/Library/Application Support/Google/Chrome';
	ITERATIONS = 1003;

} else if (process.platform === 'linux') {
	userData = process.env.HOME + '/.config/google-chrome';
	ITERATIONS = 1;

} else {

	console.error('Only Mac and Linux are supported.');
	process.exit();

}

var localState = JSON.parse(fs.readFileSync(userData + '/Local State')),
	lastUsed = localState.profile.last_used;

path = userData + '/' + lastUsed + '/Cookies';

var	KEYLENGTH = 16,
	SALT = 'saltysalt',
	db = new sqlite3.Database(path);

// Decryption based on http://n8henrie.com/2014/05/decrypt-chrome-cookies-with-python/
// Inspired by https://www.npmjs.org/package/chrome-cookies

function decrypt(key, encryptedData) {

	var decipher,
		decoded,
		final,
		padding,
		iv = new Buffer(new Array(KEYLENGTH + 1).join(' '), 'binary');

	decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	decipher.setAutoPadding(false);

	encryptedData = encryptedData.slice(3);

	decoded = decipher.update(encryptedData);

	final = decipher.final();
	final.copy(decoded, decoded.length - 1);

	padding = decoded[decoded.length - 1];
	if (padding) {
		decoded = decoded.slice(0, decoded.length - padding);
	}

	decoded = decoded.toString('utf8');

	return decoded;

}

function getDerivedKey(callback) {

	var keytar,
		chromePassword;

	if (process.platform === 'darwin') {

		keytar = require('keytar');
		chromePassword = keytar.getPassword('Chrome Safe Storage', 'Chrome');

	} else if (process.platform === 'linux') {

		chromePassword = 'peanuts';

	}

	crypto.pbkdf2(chromePassword, SALT, ITERATIONS, KEYLENGTH, callback);

}

// Chromium stores its timestamps in sqlite on the Mac using the Windows Gregorian epoch
// https://github.com/adobe/chromium/blob/master/base/time_mac.cc#L29
// This converts it to a UNIX timestamp

function convertChromiumTimestampToUnix(timestamp) {

	return int(timestamp.toString()).sub('11644473600000000').div(1000000);

}

function convertRawToNetscapeCookieFileFormat(cookies, domain) {

	var out = '',
		cookieLength = cookies.length;

	cookies.forEach(function (cookie, index) {

		out += cookie.host_key + '\t';
		out += ((cookie.host_key === '.' + domain) ? 'TRUE' : 'FALSE') + '\t';
		out += cookie.path + '\t';
		out += (cookie.secure ? 'TRUE' : 'FALSE') + '\t';

		if (cookie.has_expires) {
			out += convertChromiumTimestampToUnix(cookie.expires_utc).toString() + '\t';
		} else {
			out += '0' + '\t';
		}

		out += cookie.name + '\t';
		out += cookie.value + '\t';

		if (cookieLength > index + 1) {
			out += '\n';
		}

	});

	return out;

}

function convertRawToHeader(cookies) {

	var out = '',
		cookieLength = cookies.length;

	cookies.forEach(function (cookie, index) {

		out += cookie.name + '=' + cookie.value;
		if (cookieLength > index + 1) {
			out += '; ';
		}

	});

	return out;

}

function convertRawToJar(cookies, uri) {

	var jar = new request.jar();

	cookies.forEach(function (cookie, index) {

		var jarCookie = request.cookie(cookie.name + '=' + cookie.value);
		jar.setCookie(jarCookie, uri);

	});

	return jar;

}

function convertRawToSetCookieStrings(cookies) {

	var cookieLength = cookies.length,
		strings = [];

	cookies.forEach(function(cookie, index) {

		var out = '';

		var dateExpires = new Date(convertChromiumTimestampToUnix(cookie.expires_utc) * 1000);

		out += cookie.name + '=' + cookie.value + '; ';
		out += 'expires=' + tough.formatDate(dateExpires) + '; ';
		out += 'Domain=' + cookie.host_key + '; ';
		out += 'Path=' + cookie.path;

		if (cookie.secure) {
			out += '; Secure';
		}

		if (cookie.httponly) {
			out += '; HttpOnly';
		}

		strings.push(out);

	});

	return strings;

}

function convertRawToObject(cookies) {

	var out = {};

	cookies.forEach(function (cookie, index) {
		out[cookie.name] = cookie.value;
	});

	return out;

}

/*

	Possible formats:
	curl - Netscape HTTP Cookie File contents usable by curl and wget http://curl.haxx.se/docs/http-cookies.html
	jar - request module compatible jar https://github.com/request/request#requestjar
	set-cookie - Array of set-cookie strings
	header - "cookie" header string
	object - key/value of name/value pairs, overlapping names are overwritten

 */
var getCookies = function (uri, format, callback) {

	if (format instanceof Function) {
		callback = format;
		format = null;
	}

	var parsedUrl = url.parse(uri);

	if (!parsedUrl.protocol || !parsedUrl.hostname) {
		return callback(new Error('Could not parse URI, format should be http://www.example.com/path/'));
	}

	if (dbClosed) {
		db = new sqlite3.Database(path);
		dbClosed = false;
	}

	getDerivedKey(function (err, derivedKey) {

		if (err) {
			return callback(err);
		}

		db.serialize(function () {

			var cookies = [];

			var domain = tld.getDomain(uri);

			if (!domain) {
				return callback(new Error('Could not parse domain from URI, format should be http://www.example.com/path/'));
			}

			// ORDER BY tries to match sort order specified in
			// RFC 6265 - Section 5.4, step 2
			// http://tools.ietf.org/html/rfc6265#section-5.4
			db.each("SELECT host_key, path, secure, expires_utc, name, value, encrypted_value, creation_utc, httponly, has_expires, persistent FROM cookies where host_key like '%" + domain + "' ORDER BY LENGTH(path) DESC, creation_utc ASC", function (err, cookie) {

				var encryptedValue,
					value;

				if (err) {
					return callback(err);
				}

				if (cookie.value === '') {
					encryptedValue = cookie.encrypted_value;
					cookie.value = decrypt(derivedKey, encryptedValue);
					delete cookie.encrypted_value;
				}

				cookies.push(cookie);

			}, function () {

				var host = parsedUrl.hostname,
					path = parsedUrl.path,
					isSecure = parsedUrl.protocol.match('https'),
					cookieStore = {},
					validCookies = [],
					output;

				cookies.forEach(function (cookie) {

					if (cookie.secure && !isSecure) {
						return;
					}

					if (!tough.domainMatch(host, cookie.host_key, true)) {
						return;
					}

					if (!tough.pathMatch(path, cookie.path)) {
						return;
					}

					validCookies.push(cookie);

				});

				switch (format) {

					case 'curl':
						output = convertRawToNetscapeCookieFileFormat(validCookies, domain);
						break;

					case 'jar':
						output = convertRawToJar(validCookies, uri);
						break;

					case 'set-cookie':
						output = convertRawToSetCookieStrings(validCookies);
						break;

					case 'header':
						output = convertRawToHeader(validCookies);
						break;

					case 'object':
						/* falls through */
					default:
						output = convertRawToObject(validCookies);
						break;

				}

				db.close(function(err) {
					if (!err) {
						dbClosed = true;
					}
					return callback(null, output);
				});

			});

		});

	});

};

module.exports = {
	getCookies: getCookies,
};
