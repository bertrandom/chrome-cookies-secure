const chrome = require('../index')
const joi = require('joi')

const puppeteerCookie = joi
    .array()
    .items({
        name: joi.string().required(),
        value: joi.string().required(),
        expires: joi.any().required(), // Should be a number but not necessarily a javascript safe one, which causes joi the fail
        domain: joi.string().required(),
        path: joi.string().required(),
        Secure: joi.boolean().optional(),
        HttpOnly: joi.boolean().optional(),
    })
    .required()
    .min(1)

const url = 'https://www.google.com'

// These tests are not part of a CI / CD
// To run locally, they assumes you have some cookies for google.com under the 'Default' browser profile
it('Should get basic cookies from the defined url', async () => {
    const cookies = await chrome.getCookiesPromised(url)
    if (!Object.keys(cookies).length) {
        throw new Error('No cookie found')
    }
    // console.log(cookies)
    // Can't see an easily predictable schema in index.js to prove
    await joi.validate(cookies, joi.object().required());
}).timeout(3000)

it('Should get puppeteer cookies for the default profile in puppeteer format', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'puppeteer')
    // console.log(cookies)
    await joi.validate(cookies, puppeteerCookie);
}).timeout(3000)

// Only passes if you alter the customProfile for your use case
xit('Should get puppeteer cookies for a custom profile in puppeteer format', async () => {
    const customProfile = 'Profile 1';
    const cookies = await chrome.getCookiesPromised(url, 'puppeteer', customProfile)
    // console.log(cookies)
    await joi.validate(cookies, puppeteerCookie);
}).timeout(3000)

// Only passes if you are on macOS
xit('Should get puppeteer cookies for a path on macOS in puppeteer format', async () => {
    const customPath = `${process.env.HOME}/Library/Application Support/Google/Chrome/Default/Cookies`;
    const cookies = await chrome.getCookiesPromised(url, 'puppeteer', customPath)
    // console.log(cookies)
    await joi.validate(cookies, puppeteerCookie);
}).timeout(3000)

// Only passes if you are on windows
xit('Should get puppeteer cookies for a path on Windows in puppeteer format', async () => {
    const WINDOWS_PREFIX = 'C:\\Users\\user';
    const customPath = `${WINDOWS_PREFIX}\\AppData\\Local\\Google\\Chrome\\User Data\\${profile}\\Network\\Cookies`;
    const cookies = await chrome.getCookiesPromised(url, 'puppeteer', customPath)
    // console.log(cookies)
    await joi.validate(cookies, puppeteerCookie);
}).timeout(3000)

// Only passes if you are on linux & have Chromium installed
xit('Should getpuppeteer cookies for a path on Linux in puppeteer format', async () => {
    const customPath = `${process.env.HOME}/.config/chromium/Default/Cookies`;
    const cookies = await chrome.getCookiesPromised(url, 'puppeteer', customPath)
    // console.log(cookies)
    await joi.validate(cookies, puppeteerCookie);
}).timeout(3000)
