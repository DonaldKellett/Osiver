'use strict'

const path = require('path')
const fs = require('fs')
const moment = require('moment')

const OSIVER_CONF_BASE = process.env.OSIVER_CONF_BASE || path.join(__dirname, 'config')
const OSIVER_DATA_BASE = process.env.OSIVER_DATA_BASE || path.join(__dirname, 'data')
try {
  const NAME = 'Osiver'
  const VERSION = '0.1.0'
  const TIMEOUT = +fs.readFileSync(path.join(OSIVER_CONF_BASE, 'timeout'))
    .toString()
    .slice(0, -1)
  const DB_HOST = fs.readFileSync(path.join(OSIVER_CONF_BASE, 'db-host'))
    .toString()
    .slice(0, -1)
  const DB_PW = fs.readFileSync(path.join(OSIVER_CONF_BASE, 'db-pw'))
    .toString()
    .slice(0, -1)
  const MASTER_PW = fs.readFileSync(path.join(OSIVER_CONF_BASE, 'master-pw'))
    .toString()
    .slice(0, -1)
  const JWT_SECRET = fs.readFileSync(path.join(OSIVER_CONF_BASE, 'jwt-secret'))
    .toString()
    .slice(0, -1)
  const VALID_USERNAME = /^[a-z_]([a-z0-9_-]{0,31}|[a-z0-9_-]{0,30}\$)$/
  const SALT_ROUNDS = 10
  module.exports = {
    NAME,
    VERSION,
    TIMEOUT,
    DB_HOST,
    DB_PW,
    MASTER_PW,
    JWT_SECRET,
    OSIVER_DATA_BASE,
    VALID_USERNAME,
    SALT_ROUNDS
  }
} catch (err) {
  console.error(err)
  process.exit(1)
}
