'use strict'

const S = require('fluent-json-schema')
const mysql = require('mysql-await')
// Temporary workaround for broken connection.escape() in mysql-await
const { escape } = require('mysql')
const bcrypt = require('bcrypt')
const config = require('../../config')

const bodyJsonSchema = S.object()
  .prop('username', S.string()).required()
  .prop('oldPassword', S.string())
  .prop('masterPassword', S.string())
  .prop('newPassword', S.string()).required()
const schema = { body: bodyJsonSchema }

module.exports = async function (fastify, opts) {
  fastify.post('/', { schema }, async function (request, reply) {
    const { username, oldPassword, masterPassword, newPassword } = request.body
    if (!config.VALID_USERNAME.test(username))
      return reply.status(400).send({ message: 'The supplied username must be a valid Linux username' })
    if (!oldPassword && !masterPassword)
      return reply.status(400).send({ message: 'Exactly one of the following fields must be present: oldPassword, masterPassword' })
    if (oldPassword && masterPassword)
      return reply.status(400).send({ message: 'The oldPassword and masterPassword fields must not be supplied simultaneously' })
    if (oldPassword)
      if (oldPassword.length < 8 || oldPassword.length > 50)
        return reply.status(400).send({ message: 'The password supplied must be between 8 and 50 characters long' })
    if (newPassword.length < 8 || newPassword.length > 50)
      return reply.status(400).send({ message: 'The password supplied must be between 8 and 50 characters long' })
    try {
      let connection = mysql.createConnection({
        host: config.DB_HOST,
        user: 'osiv',
        password: config.DB_PW,
        database: 'osiv'
      })
      let users = await connection.awaitQuery(`SELECT * FROM Accounts WHERE username = ${escape(username)}`)
      if (users.length === 0)
        return reply.status(404).send({ message: 'The supplied password was incorrect, or the supplied username did not match any account' })
      if (users.length > 1)
        throw new Error('Database corruption detected: Expected at most 1 user matching the supplied username but got more')
      let user = users[0]
      if (oldPassword) {
        let oldPasswordMatch = await bcrypt.compare(oldPassword, user.password.toString())
        if (!oldPasswordMatch)
          return reply.status(404).send({ message: 'The supplied password was incorrect, or the supplied username did not match any account' })
      }
      if (masterPassword)
        if (masterPassword !== config.MASTER_PW)
          return reply.status(404).send({ message: 'The supplied password was incorrect, or the supplied username did not match any account' })
      let newPasswordHash = await bcrypt.hash(newPassword, config.SALT_ROUNDS)
      await connection.awaitQuery(`UPDATE Accounts SET password = ${escape(newPasswordHash)} WHERE username = ${escape(username)}`)
      await connection.awaitEnd()
      return {}
    } catch (err) {
      return reply.status(500).send(err)
    }
  })
}
