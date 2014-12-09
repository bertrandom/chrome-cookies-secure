var chrome = require('../chrome');

chrome.getCookies('http://smarf.toomanycooks.kitchen', function(err, cookies) {

	if (err) {
		console.error(err);
		return;
	}

	console.log(cookies);

});