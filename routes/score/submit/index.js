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

const bodySchema = S.object()
  .prop('token', S.string()).required()
  .prop('questionSetId', S.number()).required()
  .prop('percentage', S.number()).required()
const schema = { body: bodySchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { token, questionSetId, percentage } = request.body
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
      if (isNaN(questionSetId) || questionSetId < 0 || questionSetId % 1 !== 0)
	return reply.status(400).send({ message: 'The provided question set ID must be a non-negative integer' })
      if (isNaN(percentage) || percentage < 0 || percentage > 100 || percentage % 1 !== 0)
	return reply.status(400).send({ message: 'The provided percentage must be an integer between 0 and 100 inclusive' })
      let questionSets = await connection.awaitQuery(`SELECT * FROM QuestionSets WHERE id = ${questionSetId}`)
      if (questionSets.length === 0)
	return reply.status(404).send({ message: 'Could not find a question set with the provided ID' })
      if (questionSets.length > 1)
	throw new Error('Impossible case: expected at most 1 question set with the given ID but got more')
      let questionSet = questionSets[0]
      if (questionSet.graded) {
        let userScores = await connection.awaitQuery(`SELECT * FROM Scores WHERE studentId = ${user.id} AND questionSetId = ${questionSetId}`)
	if (userScores.length > 1)
	  throw new Error('Database corruption detected: expected at most 1 score entry per student for each graded question set but got more')
	if (userScores.length === 1)
	  return reply.status(403).send({ message: 'You have already submitted a score for this graded question set' })
	if (moment().isAfter(moment(questionSet.deadline)))
	  return reply.status(403).send({ message: 'You cannot submit a score to the selected graded question set past its deadline' })
      }
      await connection.awaitQuery(`INSERT INTO Scores (studentId, submitted, questionSetId, percentage) VALUES (${user.id}, CURDATE(), ${questionSetId}, ${percentage})`)
      await connection.awaitEnd()
      return reply.status(201).send({})
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
