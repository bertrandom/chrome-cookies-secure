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

const jarCookie = joi.object({
        _jar: joi.object({
            enableLooseMode: joi.boolean(),
            store: joi.object().unknown(true)
        }).unknown(true).required(),
    }).required();

module.exports = {
  puppeteerCookie,
  jarCookie
}
