const chrome = require('../index')
const joi = require('joi')
const os = require('os')
const { jarCookie, puppeteerCookie } = require('./schemas/cookies.schemas')

// These tests are not part of a CI / CD
// To run locally, they assumes you have some cookies for google.com

const url = 'https://www.google.com'

it('Should get basic cookies from the defined url', async () => {
    const cookies = await chrome.getCookiesPromised(url)
    await joi.validate(cookies, joi.object().required());
})

it('Should get curl cookies from the defined url', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'curl')
    await joi.validate(cookies, joi.string().required());
})

it('Should get jar cookies from the defined url', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'jar')
    await joi.validate(cookies, jarCookie);
})

it('Should get set-cookie cookies from the defined url', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'set-cookie')
    await joi.validate(cookies, joi.array().items(joi.string()).required());
})

it('Should get header cookies from the defined url', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'header')
    await joi.validate(cookies, joi.string().required());
})

it('Should get object cookies from the defined url', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'object')
    await joi.validate(cookies, joi.object().required());
})

it('Should get puppeteer cookies for the default profile in puppeteer format', async () => {
    const cookies = await chrome.getCookiesPromised(url, 'puppeteer')
    await joi.validate(cookies, puppeteerCookie);
})
