'use strict'

const RecurlyData = require('../recurly-data')
const _ = require('lodash')
const handleRecurlyError = require('../util').handleRecurlyError
const data2xml = require('data2xml')({
  undefined: 'empty',
  null: 'closed'
})
const debug = require('debug')('recurring')
const log = require('../logger')

class Invoice extends RecurlyData {
  constructor(recurring) {
    super({
      recurring,
      properties: [
        'account',
        'address',
        'adjustment',
        'all_line_items',
        'attempt_next_collection_at',
        'created_at',
        'closed_at',
        'currency',
        'customer_notes',
        'collection_method',
        'due_on',
        'invoice_number',
        'invoice_number_prefix',
        'line_items',
        'net_terms',
        'po_number',
        'recovery_reason',
        'shipping_address',
        'state',
        'subtotal_after_discount_in_cents',
        'subtotal_in_cents',
        'tax_in_cents',
        'terms_and_conditions',
        'total_in_cents',
        'transactions',
        'updated_at',
        'uuid',
        'vat_number'
      ],
      idField: 'uuid',
      plural: 'invoices',
      singular: 'invoice',
      enumerable: true
    })
  }

  static get SINGULAR() {
    return 'invoice'
  }

  static get PLURAL() {
    return 'invoices'
  }

  static get ENDPOINT() {
    return `${RecurlyData.ENDPOINT}${Invoice.PLURAL}`
  }

  fetchPDF(callback) {
    if (!this.href) {
      throw (new Error('cannot fetch a record without an href'))
    }

    log.info(`[Invoice/fetchPDF] Start`, { href: this.href })

    this.get(this.href, { }, {
      headers: {
        Accept: 'application/pdf'
      },
      encoding: null,
      noParse: true
    }, (err, response, payload) => {
      if (err) {
        log.error('[Invoice/fetchPDF] Error', { err })
        return callback(err)
      }
      if (response.statusCode === 404) {
        return callback(new Error('not_found'))
      }

      log.info(`[Invoice/fetchPDF] End`)
      callback(err, payload)
    })
  }

  refund(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = null
    }

    debug('Got options as %o', options)

    let uri = _.get(this, 'a.refund.href')
    if (!uri && !this.invoice_number) {
      throw (new Error('cannot refund an invoice without an invoice_number'))
    }

    const payload = {
      line_items: {
        adjustment: options
      },
      refund_method: 'transaction_first',
      external_refund: true,
      payment_method: 'other'
    }

    uri = uri || `${Invoice.ENDPOINT}/${this.invoice_number}/refund`
    const body = data2xml(Invoice.SINGULAR, payload)

    debug('Calling refund uri %s with body %o', uri, body)

    const opts = {
      headers: {
        'X-Api-Version': '2.10'
      }
    }

    this.post(uri, body, opts, (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 201 ])
      if (error) {
        return callback(error)
      }
      this.inflate(payload)
      callback(null, this)
    })
  }

  markSuccessful(callback) {
    let uri = _.get(this, 'a.mark_successful.href')
    if (!uri && !this.invoice_number) {
      throw (new Error('cannot mark invoice as successful without an invoice_number'))
    }

    uri = uri || `${Invoice.ENDPOINT}/${this.invoice_number}/mark_successful`
    const debugData = {
      url: uri
    }

    log.info(`[Invoice/markSuccessful] Start`, { debugData })

    this.put(uri, null, (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200 ])
      if (error) {
        log.error(`[Invoice/markSuccessful] Error`, {
          err,
          error,
          debugData,
          payload
        })
        return callback(error)
      }
      this.inflate(payload)
      log.info(`[Invoice/markSuccessful] End`, { debugData })
      callback(null, this)
    })
  }

  markFailed(callback) {
    let uri = _.get(this, 'a.mark_failed.href')
    if (!uri && !this.invoice_number) {
      throw (new Error('cannot mark invoice as failed without an invoice_number'))
    }

    uri = uri || `${Invoice.ENDPOINT}/${this.invoice_number}/mark_failed`
    const debugData = {
      url: uri
    }

    log.info(`[Invoice/markFailed] Start`, { debugData })

    this.put(uri, null, (err, response, payload) => {
      const error = handleRecurlyError(err, response, payload, [ 200 ])
      if (error) {
        log.error(`[Invoice/markFailed] Error`, {
          err,
          error,
          debugData,
          payload
        })
        return callback(error)
      }
      this.inflate(payload)
      callback(null, this)
    })
  }
}

module.exports = Invoice
