var chrome = require('../index');

chrome.getCookies('https://www.goodreads.com', 'header', function (err, cookies) {

	if (err) {
		console.error(err);
		return;
	}

	console.log(cookies);

});
