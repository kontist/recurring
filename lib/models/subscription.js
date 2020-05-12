'use strict'

const RecurlyData = require('../recurly-data')
const handleRecurlyError = require('../util').handleRecurlyError
const querystring = require('querystring')
const data2xml = require('data2xml')({
  undefined: 'empty',
  null: 'closed'
})
const log = require('../logger')

class Subscription extends RecurlyData {
  constructor(recurring) {
    super({
      recurring,
      properties: [
        'account',
        'activated_at',
        'bank_account_authorized_at',
        'canceled_at',
        'collection_method',
        'converted_at',
        'currency',
        'current_period_ends_at',
        'current_period_started_at',
        'customer_notes',
        'expires_at',
        'href',
        'net_terms',
        'no_billing_info_reason',
        'plan',
        'quantity',
        'revenue_schedule_type',
        'shipping_address',
        'shipping_address_id',
        'state',
        'started_with_gift',
        'subscription_add_ons',
        'tax',
        'tax_in_cents',
        'tax_type',
        'tax_region',
        'tax_rate',
        'terms_and_conditions',
        'trial_ends_at',
        'trial_started_at',
        'unit_amount_in_cents',
        'updated_at',
        'uuid',
        'pending_subscription',
        'po_number'
      ],
      idField: 'uuid',
      plural: 'subscriptions',
      singular: 'subscription',
      enumerable: true
    })

    this.__defineGetter__('account_id', () => {
      if (this._account_id) {
        return this._account_id
      }
      if (!this._resources.account) {
        return undefined
      }

      // The account property points to a hash with an href that can be used to fetch
      // the account, but sometimes I want the id.
      this._account_id = this._resources.account.match(/\/([^\/]*)$/)[1]
      return this._account_id
    })
  }

  static get SINGULAR() {
    return 'subscription'
  }

  static get PLURAL() {
    return 'subscriptions'
  }

  static get ENDPOINT() {
    return `${RecurlyData.ENDPOINT}${Subscription.PLURAL}`
  }

  static get validRefundTypes() {
    return [ 'partial', 'full', 'none' ]
  }

  getHref(type) {
    if (this.a && this.a[type]) {
      return this.a[type].href
    }

    if (!this.id) {
      throw new Error(`cannot update a subscription without an href ${this.id}`)
    }

    return `${Subscription.ENDPOINT}/${this.id}/${type}`
  }

  create(options, callback) {
    if (!options.plan_code) {
      throw (new Error('subscription must include "plan_code" parameter'))
    }
    if (!options.account) {
      throw (new Error('subscription must include "account" information'))
    }
    if (!options.account.account_code) {
      throw (new Error('subscription account info must include "account_code"'))
    }
    if (!options.currency) {
      throw (new Error('subscription must include "currency" parameter'))
    }

    const body = data2xml(Subscription.SINGULAR, options)
    const url = Subscription.ENDPOINT
    const debugData = {
      body,
      url,
      options
    }

    log.info(`[Subscription/create] Start`, {debugData})

    this.post(url, body, (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200, 201 ])
      if (error) {
        log.error('[Subscription/create] Error', { err, error, debugData, payload })
        return callback(error)
      }

      this.inflate(payload)
      log.info('[Subscription/create] End', { debugData, payload })
      callback(null, this)
    })
  }

  update(options, callback) {
    if (!options.timeframe) {
      throw (new Error('subscription update must include "timeframe" parameter'))
    }
    if (!this.href) {
      throw (new Error(`cannot update a subscription without an href ${this.id}`))
    }

    const body = data2xml(Subscription.SINGULAR, options)

    this.put(this.href, body, (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200, 201 ])
      if (error) {
        log.error(`[Subscription/update] Error`, {
          err,
          error,
          debugData: options,
          payload
        })
        return callback(error)
      }

      this.inflate(payload)
      callback(null, this)
    })
  }

  change(options, callback) {
    if (!options.timeframe) {
      throw (new Error('subscription change must include "timeframe" parameter'))
    }

    const body = data2xml(Subscription.SINGULAR, options)

    this.put(this.getHref('change'), body, (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200, 201 ])
      if (error) {
        log.error(`[Subscription/change] Error`, {
          err,
          error,
          debugData: options,
          payload
        })
        return callback(error)
      }

      this.inflate(payload)
      callback(null, this)
    })
  }

  cancel(callback) {
    this.put(this.getHref('cancel'), '', (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200 ])
      if (error) {
        return callback(error)
      }

      this.inflate(payload)
      callback(null, this)
    })
  }

  reactivate(callback) {
    this.put(this.getHref('reactivate'), '', (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200 ])
      if (error) {
        return callback(error)
      }

      this.inflate(payload)
      callback(null, this)
    })
  }

  postpone(nextRenewal, callback) {
    if (!nextRenewal || (typeof nextRenewal !== 'object')) {
      throw (new Error(`${nextRenewal} must be a valid renewal date`))
    }

    const query = querystring.stringify({ next_renewal_date: nextRenewal.toISOString() })
    const href = `${this.getHref('postpone')}?${query}`

    this.put(href, '', (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200 ])
      if (error) {
        return callback(error)
      }

      this.inflate(payload)
      callback(null, this)
    })
  }

  terminate(refundType, callback) {
    if (Subscription.validRefundTypes.indexOf(refundType) === -1) {
      throw (new Error(`refund type ${refundType} not valid`))
    }

    const query = querystring.stringify({ refund: refundType })
    const href = `${this.getHref('terminate')}?${query}`

    this.put(href, '', (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200, 201 ])
      if (error) {
        return callback(error)
      }

      this.inflate(payload)
      callback(null, this)
    })
  }
}

module.exports = Subscription
