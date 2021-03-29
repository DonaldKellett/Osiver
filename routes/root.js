'use strict'

const config = require('../config')

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return {
      name: config.NAME,
      version: config.VERSION,
      timeout: config.TIMEOUT
    }
  })
}
