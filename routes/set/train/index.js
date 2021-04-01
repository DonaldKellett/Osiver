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
  .prop('id', S.number()).required()
const schema = { query: querySchema }

module.exports = async function (fastify, opts) {
  fastify.get('/', { schema }, async function (request, reply) {
    const { token, id } = request.query
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
      if (user.privileged)
	return reply.status(404).send({ message: 'The requested resource could not be found' })
      if (isNaN(id) || id < 0 || id % 1 !== 0)
	return reply.status(400).send({ message: 'The provided ID should be a non-negative integer' })
      let questionSets = await connection.awaitQuery(`SELECT * FROM QuestionSets WHERE id = ${id}`)
      if (questionSets.length === 0)
	return reply.status(404).send({ message: 'The question set with the given ID could not be found' })
      if (questionSets.length > 1)
	throw new Error('Impossible case: expected at most 1 question set associated with ID but got more')
      let questionSet = questionSets[0]
      if (questionSet.graded) {
        let userScores = await connection.awaitQuery(`SELECT * FROM Scores WHERE studentId = ${user.id} AND questionSetId = ${id}`)
	if (userScores.length > 1)
	  throw new Error('Database corruption detected: expected at most 1 score entry per student for each graded question set but got more')
	if (userScores.length === 1)
	  return reply.status(403).send({ message: 'You have already submitted a score for this graded question set' })
	if (moment().isAfter(moment(questionSet.deadline)))
	  return reply.status(403).send({ message: 'The graded question set you requested to train on is already past its deadline' })
      }
      await connection.awaitEnd()
      return fs.readFileSync(path.join(config.OSIVER_DATA_BASE, `${questionSet.id}.json`))
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
