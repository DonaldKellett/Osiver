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
  .prop('changeToUngraded', S.boolean()).required()
  .prop('newDeadline', S.string())
const schema = { body: bodySchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { token, id, changeToUngraded, newDeadline } = request.body
    try {
      let payload = jwt.verify(token, config.JWT_SECRET)
      if (!payload || typeof payload.username !== 'string')
        return reply.status(400).send({ message: 'Expected token to deserialize to object with a username: string field' })
      const { username } = payload
      if (!config.VALID_USERNAME.test(username))
	return reply.status(400).send({ message: 'Username supplied in deserialized token must be a valid Linux username' })
      if (isNaN(id) || id < 0 || id % 1 !== 0)
	return reply.status(400).send({ message: 'The provided ID should be a non-negative integer' })
      if (!changeToUngraded) {
        if (!moment(newDeadline, 'YYYY-MM-DD').isValid())
	  return reply.status(400).send({ message: 'The extended deadline provided should be a valid date in YYYY-MM-DD format' })
	if (moment(newDeadline).isBefore(moment()))
	  return reply.status(400).send({ message: 'Cannot set a new deadline that has already passed' })
      }
      let connection = mysql.createConnection({
        host: config.DB_HOST,
	user: 'osiver',
	password: config.DB_PW,
	database: 'osiver'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
	return reply.status(404).send({ message: 'Could not find an account associated with the given username' })
      if (users.length > 1)
	throw new Error('Database corruption detected: expected at most 1 account associated with the given username but got more')
      let user = users[0]
      if (!user.privileged)
	return reply.status(404).send({ message: 'The requested resource could not be found' })
      let questionSets = await connection.awaitQuery(`SELECT * FROM QuestionSets WHERE id = ${id}`)
      if (questionSets.length === 0)
	return reply.status(404).send({ message: 'The question set with the provided ID could not be found' })
      if (questionSets.length > 1)
	throw new Error('Impossible case: selection by ID should return at most 1 result but got more')
      let questionSet = questionSets[0]
      if (questionSet.teacherId !== user.id)
	return reply.status(404).send({ message: 'The requested resource could not be found' })
      if (!questionSet.graded)
	return reply.status(403).send({ message: 'Ungraded question sets can no longer be modified' })
      if (!changeToUngraded)
	if (moment(newDeadline).isBefore(moment(questionSet.deadline)))
	  return reply.status(403).send({ message: 'The deadline of a graded question set can only be left the same or extended' })
      if (changeToUngraded)
	await connection.awaitQuery(`UPDATE QuestionSets SET graded = FALSE WHERE id = ${id}`)
      else
	await connection.awaitQuery(`UPDATE QuestionSets SET deadline = ${escape(newDeadline)} WHERE id = ${id}`)
      await connection.awaitEnd()
      return {}
    } catch (err) {
      if (err.message === 'jwt malformed' || err.message === 'invalid signature')
        return reply.status(400).send(err)
      return reply.status(500).send(err)
    }
  })
}
