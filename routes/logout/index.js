'use strict'

const S = require('fluent-json-schema')
const mysql = require('mysql-await')
// Temporary workaround for broken connection.escape() in mysql-await
const { escape } = require('mysql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const config = require('../../config')

const querySchema = S.object()
  .prop('token', S.string()).required()
const schema = { query: querySchema }

module.exports = async function (fastify, opts) {
  fastify.get('/', { schema }, async function (request, reply) {
    const { token } = request.query
    try {
      let payload = jwt.verify(token, config.JWT_SECRET)
      if (!payload || typeof payload.username !== 'string')
        return reply.status(400).send({ message: 'Expected token to deserialize to object with a username: string field' })
      const { username } = payload
      if (!config.VALID_USERNAME.test(username))
	return reply.status(400).send({ message: 'Username supplied in deserialized token must be a valid Linux username' })
      let connection = mysql.createConnection({
        host: config.DB_HOST,
	user: 'osiv',
	password: config.DB_PW,
	database: 'osiv'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
	return reply.status(404).send({ message: 'Username supplied in deserialized token did not match any existing account' })
      if (users.length > 1)
	throw new Error('Database corruption detected: Expected username supplied in deserialized token to match at most 1 existing account but got more')
      let user = users[0]
      // FIXME: Currently the token is not invalidated since JWT does not
      // provide a mechanism for doing so, and maintaining a set of invalidated
      // tokens in-memory is a violation of REST
      // Anyway, the client is expected to discard the token immediately after
      // logout so it should not be a huge issue as long as the token is not
      // leaked to an untrusted third party before the token actually expires
      await connection.awaitEnd()
      return {}
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
