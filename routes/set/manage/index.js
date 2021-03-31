'use strict'

const S = require('fluent-json-schema')
const mysql = require('mysql-await')
// Temporary workaround for broken connection.escape() in mysql-await
const { escape } = require('mysql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const moment = require('moment')
const fs = require('fs')
const path = require('path')
const config = require('../../../config')

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
	user: 'osiver',
	password: config.DB_PW,
	database: 'osiver'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
	return reply.status(404).send({ message: 'An existing account associated with the provided username could not be found' })
      if (users.length > 1)
	throw new Error('Database corruption detected: expected at most 1 account associated with the given username but got more')
      let user = users[0]
      if (!user.privileged)
	return reply.status(404).send({ message: 'The requested resource could not be found' })
      let ownedSets = await connection.awaitQuery(`SELECT id, created, graded, deadline, timeLimit FROM QuestionSets WHERE teacherId = ${user.id}`)
      await connection.awaitEnd()
      return ownedSets.map(ownedSet => {
        let setContents = fs.readFileSync(path.join(config.OSIVER_DATA_BASE, `${ownedSet.id}.json`))
	setContents = JSON.parse(setContents.toString())
	return { ...ownedSet, title: setContents.title }
      })
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
