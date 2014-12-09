# chrome-cookies-secure

Extract encrypted Google Chrome cookies for a url

## Installation

```
npm install chrome-cookies-secure
```

## API

var chrome = require('chrome-cookies-secure');
chrome.getCookies('http://www.example.com/path/', )

getCookies(url[,format],callback)
---------------------------------

`url` should be a fully qualified url, e.g. `http://www.example.com/path/`

`format` is optional and can be one of the following values:

format | description
------------ | -------------
curl | [Netscape HTTP Cookie File](http://curl.haxx.se/docs/http-cookies.html) contents usable by curl and wget
jar | cookie jar compatible with [request](https://www.npmjs.org/package/request)
set-cookie | Array of Set-Cookie header values
header | `cookie` header string, similar to what a browser would send
object (default) | Object where key is the cookie name and value is the cookie value. These are written in order so it's possible that duplicate cookie names will be overriden by later values

## Examples

jar used with request
---------------------

```
var request = require('request');
var chrome = require('chrome-cookies-secure');

chrome.getCookies('http://www.example.com/', 'jar', function(err, jar) {
	request({url: 'http://www.example.com/', jar: jar}, function (err, response, body) {
		console.log(body);
	});
});

```

## Limitations

This modules requires Keychain Access to read the Google Chrome encryption key. 