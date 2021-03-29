'use strict'

const S = require('fluent-json-schema')
const mysql = require('mysql-await')
// Temporary workaround for broken connection.escape() in mysql-await
const { escape } = require('mysql')
const bcrypt = require('bcrypt')
const config = require('../../config')

const bodyJsonSchema = S.object()
  .prop('privileged', S.boolean()).required()
  .prop('prettyName', S.string()).required()
  .prop('username', S.string()).required()
  .prop('password', S.string()).required()
  .prop('masterPassword', S.string())
const schema = { body: bodyJsonSchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { privileged, prettyName, username, password, masterPassword } = request.body
    if (prettyName.length > 1024)
      return reply.status(400).send({ message: 'The provided prettyName should not exceed 1024 characters' })
    if (!config.VALID_USERNAME.test(username))
      return reply.status(400).send({ message: 'The provided username should be a valid Linux username' })
    if (password.length < 8 || password.length > 50)
      return reply.status(400).send({ message: 'The provided password should be between 8 and 50 characters long' })
    if (privileged && masterPassword !== config.MASTER_PW)
      return reply.status(401).send({ message: 'Attempted to create privileged account with incorrect or missing master password' })
    try {
      let connection = mysql.createConnection({
        host: config.DB_HOST,
        user: 'osiv',
        password: config.DB_PW,
        database: 'osiv'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length > 0)
        return reply.status(400).send({ message: 'An account with the given username already exists' })
      let hashedPassword = await bcrypt.hash(password, config.SALT_ROUNDS)
      await connection.awaitQuery(`INSERT INTO Accounts (username, password, prettyName, privileged) VALUES (${escape(username)}, ${escape(hashedPassword)}, ${escape(prettyName)}, ${privileged ? 'TRUE' : 'FALSE'})`)
      await connection.awaitEnd()
      return reply.status(201).send({})
    } catch (err) {
      return reply.status(500).send(err)
    }
  })
}
