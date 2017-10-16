var chrome = require('../index');

chrome.getCookies('http://google.com', function (err, cookies) {

	if (err) {
		console.error(err);
		return;
	}

	console.log(cookies);

});
