'use strict'

const demand = require('must')
const Recurring = require('../lib/recurly')
const recurly = new Recurring()

const nock = require('nock')

describe('Account creation in case of duplicate account', function() {
  it('should call custom logger', function(done) {
    const account = recurly.Account()
    const accountData = { id: 'test' }

    const xmlResponse = `
<?xml version="1.0" encoding="UTF-8"?>
<errors>
    <error field="account.account_code" symbol="taken">has already been taken</error>
</errors>`.trim()

    nock('https://api.recurly.com/v2')
      .post(`/accounts`)
      .reply(422, xmlResponse)

    account.create(accountData, err => {
      demand(err).to.exist()
      err.message.must.eql('Account already exists')
      done()
    })
  })
})
