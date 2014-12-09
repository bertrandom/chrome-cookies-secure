var keytar = require('keytar'),
	sqlite3 = require('sqlite3'),
	crypto = require('crypto'),
	tld = require('tldjs'),
	url = require('url'),
	tough = require('tough-cookie'),
	Cookie = tough.Cookie,
	path = process.env.HOME + '/Library/Application Support/Google/Chrome/Default/Cookies',
	db = new sqlite3.Database(path),
	KEYLENGTH = 16,
	SALT = 'saltysalt',
	ITERATIONS = 1003;

function decrypt(key, encryptedData) {

	var decipher,
		decoded,
		iv = new Buffer(new Array(KEYLENGTH + 1).join(' '), 'binary');

	decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	encryptedData = encryptedData.slice(3);
	decoded = decipher.update(encryptedData);
	decoded += decipher.final();

	return decoded;

}

function getDerivedKey(callback) {

	var chromePassword = keytar.getPassword('Chrome Safe Storage', 'Chrome');

	crypto.pbkdf2(chromePassword, SALT, ITERATIONS, KEYLENGTH, callback);

}

function getValidHostsLookup(uri) {

	var domain,
		parsedUrl,
		host,
		splitHost,
		slicedHost,
		hosts = [],
		i,
		hostsLookup = {};

	domain = tld.getDomain(uri);
	parsedUrl = url.parse(uri);
	host = parsedUrl.hostname;
	splitHost = host.split('.');

	for (i = 0; i < splitHost.length; i++) {

		slicedHost = splitHost.slice(i).join('.');

		if (i === 0) {
			hosts.push(slicedHost);			
		}
		hosts.push('.' + slicedHost);

		if (slicedHost === domain) {
			break;
		}

	}

	for (i = 0; i < hosts.length; i++) {
		hostsLookup[hosts[i]] = i;
	}

	return hostsLookup;

}

function getCookies(uri, callback) {

	getDerivedKey(function (err, derivedKey) {

		if (err) {
			return callback(err);
		}

		db.parallelize(function () {

			var cookies = [];

			var domain = tld.getDomain(uri);

			db.each("SELECT host_key, path, secure, expires_utc, name, value, encrypted_value, creation_utc, httponly, has_expires FROM cookies where host_key like '%" + domain + "' ORDER BY LENGTH(path) DESC, creation_utc ASC", function (err, cookie) {

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

				var parsedUrl = url.parse(uri),
					host = parsedUrl.hostname,
					path = parsedUrl.path,
					isSecure = parsedUrl.protocol.match('https'),
					cookieStore = {},
					rawCookies = [];

				cookies.forEach(function(rawCookie) {

					if (rawCookie.secure && !isSecure) {
						return;
					}

					if (!tough.domainMatch(host, rawCookie.host_key, true)) {
						return;
					}

					if (!tough.pathMatch(path, rawCookie.path)) {
						return;
					}

					console.log(rawCookie.name, rawCookie.value);

				});

				// rawCookies = rawCookies.sort(function(a, b) {

				// 	if (validHosts[a.host_key] < validHosts[b.host_key]) {
				// 		return -1;
				// 	} else if (validHosts[a.host_key] > validHosts[b.host_key]) {
				// 		return 1;
				// 	} else {

				// 		if (a.name < b.name) {
				// 			return -1;
				// 		} else if (a.name > b.name) {
				// 			return 1;
				// 		} else {



				// 			return 0;
				// 		}

				// 	}

				// });

				console.log(rawCookies);


// key - string - the name or key of the cookie (default "")
// value - string - the value of the cookie (default "")
// expires - Date - if set, the Expires= attribute of the cookie (defaults to the string "Infinity"). See setExpires()
// maxAge - seconds - if set, the Max-Age= attribute in seconds of the cookie. May also be set to strings "Infinity" and "-Infinity" for non-expiry and immediate-expiry, respectively. See setMaxAge()
// domain - string - the Domain= attribute of the cookie
// path - string - the Path= of the cookie
// secure - boolean - the Secure cookie flag
// httpOnly - boolean - the HttpOnly cookie flag
// extensions - Array - any unrecognized cookie attributes as strings (even if equal-signs inside)					

// { host_key: '.nodejs.org',
//   path: '/',
//   secure: 0,
//   expires_utc: 13094099700000000,
//   name: 'abc',
//   value: '123',
//   creation_utc: 13062563757483170,
//   httponly: 0,
//   has_expires: 1 }

				// var validHosts = getValidHosts(uri);

				// var validHostsLookup = {};

				// validHosts.forEach(function (host) {
				// 	validHostsLookup[host] = true;
				// });

				// var parsedUrl = url.parse(uri);
				// var isSecure = parsedUrl.protocol.match('https');
				// var validCookies = [];

				// cookies.forEach(function(cookie) {

				// 	if (cookie.secure && !isSecure) {
				// 		return;
				// 	}

				// 	if (!validHostsLookup[cookie.host_key]) {
				// 		return;
				// 	}

				// 	validCookies.push(cookie);

				// });

				// console.log(validCookies);

				return callback(null, cookies);

			});

		});

		db.close();

	});

}

getCookies('https://www.flickr.com/photos/bertrandom', function(err, cookies) {

	//console.log(cookies);

});