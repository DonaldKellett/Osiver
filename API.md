# Osiv API

This document defines the Osiv API. An HTTP(S) server conforming to the API by exposing the endpoints defined below with the documented behavior is said to be Osiv-compliant.

Note that all responses below are assumed to be JSON unless otherwise specified.

API version: `0.1.1`

## Server Metadata

### `GET /`

Returns metadata about the server.

It should always return a `200 OK` status code, unless there is an internal server error in which a 5xx status code should be returned instead. No other status codes should be returned by this endpoint.

#### `200 OK`

On `200 OK`, the server should return a JSON object with the following fields:

- `"name"`: The name of the server. Should be `"Osiv"`
- `"version"`: The version of the Osiv API that the server adheres to. Should be a SemVer compliant version number, e.g. `"0.1.0"`
- `"timeout"`: Timeout for account logins, in seconds. E.g. if a login timeouts after 24 hours, the value should be `86400`

## Account creation and deletion

### `POST /signup`

Signs up for an account. When this endpoint is used, the server expects JSON data containing the following fields:

- `"privileged"`: A boolean value indicating whether the account to be created is privileged
- `"prettyName"`: A human-readable name associated with the account, e.g. `"John Doe"`. There should be as few restrictions on the format of this field as possible. For example, rejecting pretty names over 1024 characters would be acceptable, but rejecting any pretty name with non-alphanumeric characters would not be acceptable
- `"username"`: A unique identifier for the account, e.g. `"johndoe"`. The server may enforce suitable restrictions on the format of this field, e.g. it may choose to accept all valid Unix usernames, and only those usernames
- `"password"`: The plaintext password for the account. The server may enforce sensible rules on the format of the password, e.g. they should be between 8 and 128 characters long, but please don't go overboard with this, e.g. requiring passwords to contain at least one uppercase letter, one lowercase, one digit and one special character is infuriating and does little to increase password security. Of course the server should not store the plaintext password as-is, but that is considered an implementation detail irrelevant to the API itself
- `"masterPassword"`: Optional field that is only checked by the server when a privileged account is being created. The server should only ever accept a single master password as valid, and the master password should be kept secret

This endpoint may return any of the following status codes and only these status codes, unless there is a server error in which a 5xx status code is returned:

- `201 Created`
- `400 Bad Request`
- `401 Unauthorized`

#### `201 Created`

The account (whether privileged or not) has been successfully created. A JSON object should be returned, but there are no mandatory fields, i.e. an empty object `{}` is valid.

#### `400 Bad Request`

The account has not been created due to missing or invalid POST data, e.g. the client forgot to include a username or the password is too short. This return code should also be used if an account associated with the provided username already exists.

Note that an invalid master password when creating a privileged account should return `401 Unauthorized` instead. A missing master password when creating a privileged account can be handled either way.

On `400 Bad Request`, a JSON object should be returned with the following fields:

- `"message"`: A short human-readable description of what user-invoked action caused the account creation to fail, e.g. `"The provided username must be between 1 and 32 characters."`

#### `401 Unauthorized`

The privileged account has not been created due to an invalid master password being supplied. A missing master password when creating a privileged account may also trigger this return code (if not, a `400 Bad Request` should be returned instead).

On `401 Unauthorized`, a JSON object should be returned with the following fields:

- `"message"`: A short human-readable description of what user-invoked action caused the account creation to fail, e.g. `"Master password was not as expected."`

### `POST /delete`

Deletes the account with the given username provided that the action is authorized with the user's password OR the master password. In a valid request to this endpoint, the user's password and master password should NOT be simultaneously provided.

The server expects JSON data containing the following fields:

- `"username"`: The username of the account to be deleted, e.g. `"johndoe"`
- `"password"`: The plaintext password associated with the given username. Should NOT appear simultaneously with the `"masterPassword"` field
- `"masterPassword"`: The master password in plaintext. Should NOT appear simultaneousy with the `"password"` field

This endpoint may return any of the following status codes and only these status codes, unless there is a server error in which a 5xx status code is returned:

- `204 No Content`
- `400 Bad Request`
- `401 Unauthorized`
- `404 Not Found`

#### `204 No Content`

The account has been successfully deleted. No JSON payload is required.

#### `400 Bad Request`

The JSON payload associated with the request is malformed, e.g. some fields are missing. The server should respond with a JSON payload containing the following fields:

- `"message"`: A short human-readable description of the user-invoked error, e.g. `"The user's and master password fields should not appear simultaneously."`

#### `401 Unauthorized`

The account deletion request failed due to an incorrect password. Note that it is acceptable to replace this response with `404 Not Found` in order to conceal sensitive information from potential attackers; see below for more details.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short human-readable description of the user-invoked error, e.g. `"The master password provided was incorrect."`

#### `404 Not Found`

The account associated with the given username was not found and therefore could not be deleted. Note that it is acceptable to return this response for incorrect passwords as well in order to conceal sensitive information from potential attackers.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short human-readable description of the user-invoked error, e.g. `"The username could not be found or the supplied password is incorrect."`

## Account modification

### `POST /reset`

Reset the password for the account with the specified username provided that the action is authorized by the user's old password OR the master password. In a valid request to this endpoint, the user's old password and the master password should NOT appear simultaneously.

The server expects a JSON payload with the following fields:

- `"username"`: The username of the associated account, e.g. `"johndoe"`
- `"oldPassword"`: The password associated with the account prior to the password change. This field should NOT appear simultaneously with the `"masterPassword"` field
- `"masterPassword"`: The master password for the server. This field should NOT appear simultaneously with the `"oldPassword"` field
- `"newPassword"`: The new password to be associated with the account. If the account's old password is used to authorize the action then the new password should differ from the old password

Unless the server encounters an internal error which may cause it to return a 5xx status code, the server should return one of the status codes below and only those status codes:

- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`
- `404 Not Found`

#### `200 OK`

The password was reset successfully for the associated account. The server should respond with a JSON payload but no fields are mandatory, i.e. an empty object `{}` is valid.

#### `400 Bad Request`

The JSON payload in the POST request is malformed, e.g. one or more fields may be missing. The server should respond with a JSON payload containing the following fields:

- `"message"`: The reason for the error, e.g. `"The old password and master password should not be provided simultaneously."`

#### `401 Unauthorized`

The provided password credentials are incorrect. It is acceptable to replace this response with `404 Not Found` in order to conceal sensitive information from potential attackers.

The server should respond with a JSON payload containing the following fields:

- `"message"`: The reason for the rejection, e.g. `"The old password provided was incorrect."`

#### `404 Not Found`

The provided username did not match any account. It is acceptable to return this status code for an incorrect old/master password as well, in order to conceal sensitive information from potential attackers.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The account does not exist or the password credentials you provided were incorrect."`

## Account login and logout

### `POST /login`

Login to an account with the given username and password. The server expects a JSON payload containing the following fields:

- `"username"`: The username associated with the account, e.g. `"johndoe"`
- `"password"`: The plaintext password associated with the account, e.g. `"P@ssw0rd"`

Unless a server error occurs in which case a 5xx status code should be returned, one of the following status codes should be returned by the server:

- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`
- `404 Not Found`

#### `200 OK`

The login was successful. The server should respond with a JSON payload containing the following fields:

- `"token"`: The login token associated with the login session, e.g. `"12345678"`

#### `400 Bad Request`

The request was malformed, e.g. one or more fields are missing. The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description for the error, e.g. `"The username field is missing."`

#### `401 Unauthorized`

The login was unsuccessful due to an incorrect password. It is acceptable to return `404 Not Found` instead in order to conceal sensitive information from potential attackers.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Incorrect password"`

#### `404 Not Found`

The provided username is not associated with an existing account. It is acceptable to return this status code for incorrect passwords as well, in order to conceal sensitive information from potential attackers.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Incorrect username or password"`

### `GET /logout`

Log out of an existing session with the associated token. The server expects the following query string parameters:

- `token`: The token associated with the login session to be invalidated, e.g. `12345678`

Unless the server encounters an error in which case a 5xx status code should be returned, the server should return one of the following status codes:

- `200 OK`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `200 OK`

The login session was successfully invalidated, i.e. the user logged out successfully. The server should reply with a JSON payload, but no fields are mandatory, e.g. `{}` is valid.

#### `400 Bad Request`

The request was malformed in some way, e.g. `token` was not provided. The server should reply with a JSON payload containing the following fields:

- `"message"`: The reason for the error, e.g. `"Token was not provided."`

#### `403 Forbidden`

The token was not associated with an existing login session. It is acceptable to return `404 Not Found` instead in this case.

The server should reply with a JSON payload containing the following fields:

- `"message"`: The reason for the error, e.g. `"Token not associated with existing login session."`

#### `404 Not Found`

Any other error caused by the user. The server should reply with a JSON payload containing the following fields:

- `"message"`: The reason for the error, e.g. `"Unknown user error."`

## Account actions

### `GET /profile`

Retrieve information about the user (their profile). Since user information is considered private, a logged in user can only view their own profile.

The server expects the following query parameters:

- `token`: The token associated with the current login session, e.g. `12345678`

Unless a server error occurred in which case a 5xx status code should be returned, the server should return one of the following status codes below:

- `200 OK`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `200 OK`

The request was successful and the logged in user is authorized to view his/her own profile. The server should respond with a JSON payload containing the following fields:

- `"privileged"`: A boolean value indicating whether the current account is privileged
- `"prettyName"`: The human-readable name associated with the account, e.g. `"John Doe"`
- `"username"`: The username associated with the account, e.g. `"johndoe"`

#### `400 Bad Request`

The request was malformed, e.g. the `token` parameter is missing. The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Missing token parameter"`

#### `403 Forbidden`

The login token is not associated with an existing session. It is acceptable to return `404 Not Found` instead in this case.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Token not associated with login session"`

#### `404 Not Found`

Any other user error. The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Unknown user error"`
