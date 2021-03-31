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
  .prop('graded', S.boolean()).required()
  .prop('deadline', S.string())
  .prop('timeLimit', S.number()).required()
  .prop('questionSet', S.object()
    .prop('title', S.string()).required()
    .prop('description', S.string()).required()
    .prop('problems', S.array().items(S.object()
      .prop('question', S.string()).required()
      .prop('answers', S.array().items(S.string())).required())).required()).required()
const schema = { body: bodySchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { token, graded, deadline, timeLimit, questionSet } = request.body
    try {
      let payload = jwt.verify(token, config.JWT_SECRET)
      if (!payload || typeof payload.username !== 'string')
        return reply.status(400).send({ message: 'Expected token to deserialize to object with a username: string field' })
      const { username } = payload
      if (!config.VALID_USERNAME.test(username))
	return reply.status(400).send({ message: 'Username supplied in deserialized token must be a valid Linux username' })
      if (graded) {
	if (!deadline || !moment(deadline, 'YYYY-MM-DD').isValid())
	  return reply.status(400).send({ message: 'A valid deadline in YYYY-MM-DD form must be provided for graded question sets' })
	if (moment(deadline).isBefore(moment()))
	  return reply.status(400).send({ message: 'The provided deadline must not be before the current date' })
      }
      if (isNaN(timeLimit) || timeLimit < 0 || timeLimit % 1 !== 0)
	return reply.status(400).send({ message: 'The provided time limit must be a non-negative integer' })
      if (questionSet.problems.length === 0)
	return reply.status(400).send({ message: 'The question set must contain at least 1 question' })
      if (!questionSet.problems.every(({ answers }) => answers.length === 4))
	return reply.status(400).send({ message: 'Each multiple choice question in the question set must have exactly 4 possible options' })
      let connection = mysql.createConnection({
        host: config.DB_HOST,
        user: 'osiver',
        password: config.DB_PW,
        database: 'osiver'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
	return reply.status(404).send({ message: 'Could not find the user with the given username' })
      if (users.length > 1)
	throw new Error('Database corruption detected: expected at most 1 user with the given username but got more')
      let user = users[0]
      if (!user.privileged)
	return reply.status(404).send({ message: 'The requested resource was not found' })
      let { insertId } = await connection.awaitQuery(`INSERT INTO QuestionSets (teacherId, created, graded, deadline, timeLimit) VALUES (${user.id}, CURDATE(), ${graded}, ${graded ? escape(deadline) : 'CURDATE()'}, ${timeLimit})`)
      await fs.writeFile(path.join(config.OSIVER_DATA_BASE, `${insertId}.json`), JSON.stringify(questionSet))
      await connection.awaitEnd()
      return reply.status(201).send({})
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
