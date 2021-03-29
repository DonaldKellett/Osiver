'use strict'

const S = require('fluent-json-schema')
const mysql = require('mysql-await')
// Temporary workaround for broken connection.escape() in mysql-await
const { escape } = require('mysql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const config = require('../../config')

const bodyJsonSchema = S.object()
  .prop('username', S.string()).required()
  .prop('password', S.string()).required()
const schema = { body: bodyJsonSchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { username, password } = request.body
    if (!config.VALID_USERNAME.test(username))
      return reply.status(400).send({ message: 'The supplied username must be a valid Linux username' })
    if (password.length < 8 || password.length > 50)
      return reply.status(400).send({ message: 'The supplied password must be between 8 and 50 characters long' })
    try {
      let connection = mysql.createConnection({
        host: config.DB_HOST,
        user: 'osiv',
        password: config.DB_PW,
        database: 'osiv'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
        return reply.status(404).send({ message: 'The supplied password was incorrect, or the supplied username did not match any existing accounts' })
      if (users.length > 1)
        throw new Error('Database corruption detected: Expected exactly 1 account with the supplied username but got more')
      let user = users[0]
      let passwordMatch = await bcrypt.compare(password, user.password.toString())
      if (!passwordMatch)
        return reply.status(404).send({ message: 'The supplied password was incorrect, or the supplied username did not match any existing accounts' })
      let token = jwt.sign({ username }, config.JWT_SECRET, { expiresIn: config.TIMEOUT })
      await connection.awaitEnd()
      return { token }
    } catch (err) {
      return reply.status(500).send(err)
    }
  })
}
