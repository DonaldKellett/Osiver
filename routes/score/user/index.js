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
  .prop('studentId', S.number()).required()
  .prop('questionSetId', S.number()).required()
const schema = { query: querySchema }

module.exports = async function (fastify, opts) {
  fastify.get('/', { schema }, async function (request, reply) {
    const { token, studentId, questionSetId } = request.query
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
      if (isNaN(studentId) || studentId < 0 || studentId % 1 !== 0)
	return reply.status(400).send({ message: 'The provided student ID must be a non-negative integer' })
      if (isNaN(questionSetId) || questionSetId < 0 || questionSetId % 1 !== 0)
	return reply.status(400).send({ message: 'The provided question set ID must be a non-negative integer' })
      let students = await connection.awaitQuery(`SELECT * FROM Accounts WHERE id = ${studentId}`)
      if (students.length === 0)
	return reply.status(404).send({ message: 'Could not find the student with the provided ID' })
      if (students.length > 1)
	throw new Error('Impossible case: expected at most 1 student with matching ID but got more')
      let student = students[0]
      if (student.privileged)
	return reply.status(403).send({ message: 'Cannot get the scores of a teacher' })
      let questionSets = await connection.awaitQuery(`SELECT * FROM QuestionSets WHERE id = ${questionSetId}`)
      if (questionSets.length === 0)
	return reply.status(404).send({ message: 'Could not find the question set with the provided ID' })
      if (questionSets.length > 1)
	throw new Error('Impossible case: expected at most 1 question set with matching ID but got more')
      let questionSet = questionSets[0]
      if (!questionSet.graded)
	return reply.status(403).send({ message: 'Cannot get the scores of a student for ungraded question sets' })
      let result = await connection.awaitQuery(`SELECT id, submitted, percentage FROM Scores WHERE studentId = ${studentId} AND questionSetId = ${questionSetId}`)
      await connection.awaitEnd()
      return result
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
