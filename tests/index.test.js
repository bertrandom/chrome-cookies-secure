const chrome = require('../index')
const joi = require('joi')

const puppeteerCookie = joi.array().items({
    name: joi.string().required(),
    value: joi.string().required(),
    expires: joi.any().required(), // Should be a number but not necessarily a javascript safe one, which causes joi the fail
    domain: joi.string().required(),
    path: joi.string().required(),
    Secure: joi.boolean().optional(),
    HttpOnly: joi.boolean().optional(),
}).required().min(1)

const url = 'https://www.google.com'

// These tests are not part of a CI / CD
// To run locally, they assumes you have some cookies for google.com under the 'Default' browser profile
it('Should get basic cookies from the defined url', async () => {
    const cookiesBasic = await chrome.getCookiesPromised(url)
    if (!Object.keys(cookiesBasic).length) {
        throw new Error('No cookie found')
    }
    // Can't see an easily predictable schema in index.js to prove
    // await joi.validate(cookiesBasic, joi.object().required());
})

it('Should get puppeteer cookies from the defined url', async () => {
    const cookiesPuppeteer = await chrome.getCookiesPromised(url, 'puppeteer')
    await joi.validate(cookiesPuppeteer, puppeteerCookie);
})