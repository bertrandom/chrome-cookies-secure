# chrome-cookies-secure

Extract encrypted Google Chrome cookies for a url on Mac OS X or Linux

## Installation

```
npm install chrome-cookies-secure
```

## API

getCookies(url[,format],callback,profile)
---------------------------------

`url` should be a fully qualified url, e.g. `http://www.example.com/path/`

`format` is optional and can be one of the following values:

format | description
------------ | -------------
curl | [Netscape HTTP Cookie File](http://curl.haxx.se/docs/http-cookies.html) contents usable by curl and wget
jar | cookie jar compatible with [request](https://www.npmjs.org/package/request)
set-cookie | Array of Set-Cookie header values
header | `cookie` header string, similar to what a browser would send
puppeteer | an array of objects that can be loaded directly into puppeteer setCookie(...) for testing
object | (default) Object where key is the cookie name and value is the cookie value. These are written in order so it's possible that duplicate cookie names will be overriden by later values

If `format` is not specified, `object` will be used as the format by default.

Cookie order tries to follow [RFC 6265 - Section 5.4, step 2](http://tools.ietf.org/html/rfc6265#section-5.4) as best as possible.

## Examples

basic usage
-----------

```
const chrome = require('chrome-cookies-secure');
chrome.getCookies('http://www.example.com/path/', function(err, cookies) {
	console.log(cookies);
});
```

jar used with request
---------------------

```
const request = require('request');
const chrome = require('chrome-cookies-secure');

chrome.getCookies('http://www.example.com/', 'jar', function(err, jar) {
	request({url: 'http://www.example.com/', jar: jar}, function (err, response, body) {
		console.log(body);
	});
});

```

puppeteer with specific Chrome profile
---------------------

```
const chrome = require('chrome-cookies-secure');
const puppeteer = require('puppeteer')

// puppeteer page launch stuff

let puppeteerCookies;

chrome.getCookies('http://www.example.com/path/', function(err, cookies) {
	puppeteerCookies = cookies;
}, 'YourChromeProfile'); 

// Profiles can be found in '~/Library/Application Support/Google/Chrome' 

await page.waitFor(1000);
await page.setCookie(...puppeteerCookies);

```

## Limitations

On OS X, this module requires Keychain Access to read the Google Chrome encryption key. The first time you use it, it will popup this dialog:

![image](https://raw.githubusercontent.com/bertrandom/chrome-cookies-secure/gh-pages/access.png)

The SQLite database that Google Chrome stores its cookies is only persisted to every 30 seconds or so, so this can explain while you'll see a delay between which cookies your browser has access to and this module.

## License

This software is free to use under the MIT license. See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: https://github.com/bertrandom/chrome-cookies-secure/blob/master/LICENSE.md
