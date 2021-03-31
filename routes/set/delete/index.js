'use strict'

const S = require('fluent-json-schema')
const mysql = require('mysql-await')
// Temporary workaround for broken connection.escape() in mysql-await
const { escape } = require('mysql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const moment = require('moment')
const fs = require('fs').promises
const path = require('path')
const config = require('../../../config')

const bodySchema = S.object()
  .prop('token', S.string()).required()
  .prop('id', S.number()).required()
const schema = { body: bodySchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { token, id } = request.body
    try {
      let payload = jwt.verify(token, config.JWT_SECRET)
      if (!payload || typeof payload.username !== 'string')
        return reply.status(400).send({ message: 'Expected token to deserialize to object with a username: string field' })
      const { username } = payload
      if (!config.VALID_USERNAME.test(username))
	return reply.status(400).send({ message: 'Username supplied in deserialized token must be a valid Linux username' })
      if (isNaN(id) || id < 0 || id % 1 !== 0)
	return reply.status(400).send({ message: 'The supplied ID must be a non-negative integer' })
      let connection = mysql.createConnection({
        host: config.DB_HOST,
	user: 'osiver',
	password: config.DB_PW,
	database: 'osiver'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
	return reply.status(404).send({ message: 'The username supplied does not correspond to an existing account' })
      if (users.length > 1)
	throw new Error('Database corruption detected: expected at most 1 account associated with the username but got more')
      let user = users[0]
      if (!user.privileged)
        return reply.status(404).send({ message: 'The requested resource was not found' })
      let questionSets = await connection.awaitQuery(`SELECT * FROM QuestionSets WHERE id = ${id}`)
      if (questionSets.length === 0)
	return reply.status(404).send({ message: 'The question set with the specified ID could not be found' })
      if (questionSets.length > 1)
	throw new Error('Impossible case: selection by ID should return at most one entry but got more')
      let { teacherId } = questionSets[0]
      if (teacherId !== user.id)
	return reply.status(404).send({ message: 'The question set with the specified ID could not be found' })
      await connection.awaitQuery(`DELETE FROM Scores WHERE questionSetId = ${id}`)
      await fs.unlink(path.join(config.OSIVER_DATA_BASE, `${id}.json`))
      await connection.awaitQuery(`DELETE FROM QuestionSets WHERE id = ${id}`)
      await connection.awaitEnd()
      return reply.status(204).send()
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
