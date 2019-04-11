// const browser = await puppeteer.launch({ 
//  // your args
// });

// const page = await browser.newPage();

let cookiesToSave;

chrome.getCookies('https://yourURL.com', 'puppeteer', function(err, cookies) {
    if (err) {
        console.log({message: 'error', err});
        return
    }
    cookiesToSave = cookies
}, 'YourChromeProfile')

// Profiles can be found in '~/Library/Application Support/Google/Chrome/${profile}' 

// await page.waitFor(2000);
await page.setCookie(...cookiesToSave);

// let result = await page.evaluate(() => {
//     let stuff;
//     // do stuff here
//     return stuff; 
// })
// .catch((e) => {
//     // catch any errors
// });

// browser.close();
// return result