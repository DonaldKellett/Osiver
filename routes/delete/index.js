'use strict'

const S = require('fluent-json-schema')
const mysql = require('mysql-await')
// Temporary workaround for broken connection.escape() in mysql-await
const { escape } = require('mysql')
const bcrypt = require('bcrypt')
const config = require('../../config')

const bodyJsonSchema = S.object()
  .prop('username', S.string()).required()
  .prop('password', S.string())
  .prop('masterPassword', S.string())
const schema = { body: bodyJsonSchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { username, password, masterPassword } = request.body
    if (!config.VALID_USERNAME.test(username))
      return reply.status(400).send({ message: 'The username provided should be a valid Linux username' })
    if (!password && !masterPassword)
      return reply.status(400).send({ message: 'Expected one of the following fields to be present: password, masterPassword' })
    if (password && masterPassword)
      return reply.status(400).send({ message: 'The password and masterPassword fields should not be simultaneously present' })
    if (password)
      if (password.length < 8 || password.length > 50)
        return reply.status(400).send({ message: 'Password provided should be between 8 and 50 characters long' })
    try {
      let connection = mysql.createConnection({
        host: config.DB_HOST,
        user: 'osiv',
        password: config.DB_PW,
        database: 'osiv'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
        return reply.status(404).send({ message: 'The password supplied was incorrect or the account with the supplied username was not found' })
      if (users.length > 1)
        throw new Error('Database corruption detected: Expected at most 1 user with the supplied username but got more')
      let user = users[0]
      if (password) {
        let passwordMatch = await bcrypt.compare(password, user.password.toString())
        if (!passwordMatch)
          return reply.status(404).send({ message: 'The password supplied was incorrect or the account with the supplied username was not found' })
      }
      if (masterPassword)
        if (masterPassword !== config.MASTER_PW)
          return reply.status(404).send({ message: 'The password supplied was incorrect or the account with the supplied username was not found' })
      await connection.awaitQuery(`DELETE FROM Accounts WHERE username = ${escape(username)}`)
      await connection.awaitEnd()
      return reply.status(204).send()
    } catch (err) {
      return reply.status(500).send(err)
    }
  })
}
