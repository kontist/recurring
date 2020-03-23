'use strict'

const demand = require('must')
const Recurring = require('../lib/recurly')
const recurly = new Recurring()

const nock = require('nock')

describe('Subscription update in case of closed account', function() {
  it('should call callback with an error', function(done) {
    const subscription = recurly.Subscription()
    subscription.id = 'test'
    const subscriptionData = {
      timeframe: 'now',
      unit_amount_in_cents: 900,
      coupon_code: 'lexoffice100'
    }

    const xmlResponse = `
<?xml version="1.0" encoding="UTF-8"?>
<errors>
  <error field="subscription.base" symbol="">Subscription cannot be edited. Associated account is closed</error>
</errors>`.trim()

    nock('https://api.recurly.com/v2')
      .put(`/subscriptions/${subscription.id}`)
      .reply(422, xmlResponse)

    subscription.update(subscriptionData, err => {
      demand(err).to.exist()
      err.message.must.eql('subscription.base Subscription cannot be edited. Associated account is closed')
      done()
    })
  })
})
