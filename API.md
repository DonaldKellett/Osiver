# Osiver API

This document defines the Osiver API. An HTTP(S) server conforming to the API by exposing the endpoints defined below with the documented behavior is said to be Osiver-compliant.

Note that all responses below are assumed to be JSON unless otherwise specified.

API version: `0.1.0`

## Server Metadata

### `GET /`

Returns metadata about the server.

It should always return a `200 OK` status code, unless there is an internal server error in which a 5xx status code should be returned instead. No other status codes should be returned by this endpoint.

#### `200 OK`

On `200 OK`, the server should return a JSON object with the following fields:

- `"name"`: The name of the server. Should be `"Osiver"`
- `"version"`: The version of the Osiver API that the server adheres to. Should be a SemVer compliant version number, e.g. `"0.1.0"`
- `"timeout"`: Timeout for account logins, in seconds. E.g. if a login timeouts after 24 hours, the value should be `86400`

## Account Management

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

Deletes the account with the given username and all associated data provided that the action is authorized with the user's password OR the master password. In a valid request to this endpoint, the user's password and master password should NOT be simultaneously provided.

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

The account and all associated data have been successfully deleted. No JSON payload is required.

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

### `GET /profile`

Retrieve information about the user (their profile). Since user information is considered private, a logged in user should only be able to view their own profile directly.

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

## Question Sets

### `POST /set/create`

Create a question set with the provided contents. This is a privileged operation.

A valid request to this endpoint shall include a JSON payload with the following fields:

- `"token"`: The token associated with the current login session, e.g. `"12345678"`
- `"graded"`: Whether the question set to be created is graded
- `"deadline"`: A date string in `yyyy-mm-dd` format indicating when the question set is due, e.g. `"2021-03-30"`. Only required when the question set is graded; otherwise, this field is ignored
- `"timeLimit"`: A whole number indicating the time limit for the question set in seconds, e.g. `300` for 5 minutes
- `"questionSet"`: The contents of the question set. This should be an object with the following fields:
  - `"title"`: A title describing the nature of the question set, e.g. `"GNU/Linux trivia"`
  - `"description"`: A longer description of what the question set is about, e.g. `"A sample problem set on fun facts about GNU/Linux, used for demonstrating the app only"`
  - `"problems"`: A non-empty array of objects, each with the following fields:
    - `"question"`: The problem statement, e.g. `"What is Linux?"`
    - `"answers"`: An array of length 4 where each element is a string representing a possible answer to the question, e.g. `["An operating system kernel", "A fully functioning operating system", "A brand of potato chips", "A top secret project under development by Microsoft"]`. The first item in the array is taken as the correct answer

The server may respond with any of the following status codes, or a 5xx status code in case of a server error:

- `201 Created`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `201 Created`

The question set has been successfully created. The server should return a JSON payload but no fields are required, e.g. `{}` is a valid payload.

#### `400 Bad Request`

The payload associated with the POST request was malformed. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of what caused the error, e.g. `"The provided date was invalid"`

#### `403 Forbidden`

The payload associated with the POST request was valid but the user requesting the operation does not have sufficient privileges. It is acceptable to return `404 Not Found` in place of this status code to conceal sensitive information from potential attackers.

The server should return a JSON payload containing the following fields:

- `"message"`: A short description of what caused the error, e.g. `"Students are not allowed to create their own question sets"`

#### `404 Not Found`

Any other user error. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of what caused the error, e.g. `"The requested resource does not exist"`

### `POST /set/delete`

Delete the selected question set and all its associated data. This is a privileged operation. Note that a question set can only be deleted by its owner, i.e. the privileged user who created it.

A valid request to this endpoint should contain a JSON payload with the following fields:

- `"token"`: The login token associated with the current session, e.g. `"12345678"`
- `"id"`: The ID number associated with the set to be deleted, e.g. `17`

The server may return any of the following status codes or 5xx on error:

- `204 No Content`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `204 No Content`

The question set and all its associated data have been successfully deleted. No JSON payload is necessary.

#### `400 Bad Request`

The request was malformed, e.g. some fields were missing. The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The provided ID should be a number"`

#### `403 Forbidden`

The user requesting the operation does not have sufficient privileges, or the privileged user is not the owner of the question set. It is acceptable to respond with `404 Not Found` instead in this scenario to conceal sensitive information from potential attackers.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Students are not allowed to delete question sets"`

#### `404 Not Found`

Any other user error. The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The question set with the provided ID was not found, you do not have the privilege to delete this problem set or you cannot delete this problem set as you are not its owner"`

### `POST /set/modify`

Update various metadata for the question set. This is a privileged operation and can only be performed by the owner of the question set. Also, only the following types of modification can be performed:

- Changing a graded assignment to an ungraded one
- Extending the deadline of a graded assignment

The rationale: Any other type of modification would lead to unfairness among students or change the meaning of existing student grades. 

The JSON payload associated with this request should contain the following fields:

- `"token"`: The login token associated with the current session, e.g. `"12345678"`
- `"id"`: The ID number associated with the question set, e.g. `17`
- `"changeToUngraded"`: A boolean value indicating whether the graded assignment should be changed to ungraded
- `"newDeadline"`: The new deadline for the graded assignment as a string in `yyyy-mm-dd` format, e.g. `"2021-12-31"`. This should not be earlier than the previous deadline. Ignored if `"changeToUngraded"` is `true`.

The server may respond with any of the following status codes or 5xx on error:

- `200 OK`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `200 OK`

The modification was successfully performed. A JSON payload should be returned but no fields are necessary, i.e. `{}` is valid.

#### `400 Bad Request`

The request was malformed. The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The changeToUngraded field is missing"`

#### `403 Forbidden`

The request is well-defined but the user does not have sufficient privileges, is not the owner of the question set or attempted to perform an invalid operation, e.g. trying to modify an ungraded assignment. It is acceptable to return `404 Not Found` instead in this case to conceal sensitive information from potential attackers.

The server should respond with a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Attempted to modify an ungraded assignment"`

#### `404 Not Found`

Any other user error. The server should return a JSON payload with the following fields:

- `"message"`: A short description of the error, e.g. `"Question set not found, or insufficient privileges, or invalid operation on question set"`

### `GET /set/manage`

Retrieve metadata on all question sets owned by the user. This is a privileged operation.

The server expects the following query string parameters to be sent along with the GET request:

- `token`: The login token associated with the current session, e.g. `12345678`

The server may return any of the following status codes or 5xx on error:

- `200 OK`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `200 OK`

The operation was successful. The server should return an array of objects, each containing the following fields:

- `"id"`: The ID number associated with the question set, e.g. `17`
- `"graded"`: A boolean value indicating whether the question set is graded
- `"deadline"`: The deadline for the question set in `yyyy-mm-dd` format if the set is graded, e.g. `"2021-12-31"`. This field is only present for graded question sets
- `"timeLimit"`: The time limit for the question set in seconds, e.g. `300`

#### `400 Bad Request`

The request was malformed, e.g. the supplied token is invalid. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The supplied login token is invalid"`

#### `403 Forbidden`

The user does not have sufficient privileges. It is acceptable to return `404 Not Found` instead in this case to conceal sensitive information from potential attackers.

The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Students are not allowed to manage question sets"`

#### `404 Not Found`

Any other user error. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The requested resource was not found"`

### `GET /set/browse`

Fetch the metadata for all question sets. This can only be performed by a non-privileged user.

The server expects the following GET parameters:

- `token`: The login token associated with the current session, e.g. `12345678`

The server may return any of the following status codes or 5xx on error:

- `200 OK`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `200 OK`

The requested operation was successful. The server returns an array of objects, each containing the following fields:

- `"id"`: The ID number associated with the question set, e.g. `17`
- `"owner"`: The human-readable name of the privileged user owning this question set, e.g. `"John Doe"`
- `"graded"`: A boolean value indicating whether the question set is graded
- `"deadline"`: The deadline for the question set in `yyyy-mm-dd` format if the set is graded, e.g. `"2021-12-31"`. This field is only present for graded question sets
- `"timeLimit"`: The time limit for the question set in seconds, e.g. `300`

#### `400 Bad Request`

The request was malformed, e.g. the supplied token is invalid. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The supplied login token is invalid"`

#### `403 Forbidden`

A privileged user attempted to perform this operation. It is acceptable to return `404 Not Found` instead in this case to conceal sensitive information from potential attackers.

The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"Teachers are not allowed to browse all question sets"`

#### `404 Not Found`

Any other user error. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The requested resource was not found"`

### `GET /set/train`

Fetch a problem set to train on. This can only be performed by unprivileged users. Furthermore, this endpoint fails for graded question sets if:

- The user requesting the question set already has a score associated with the set
- It is already past the deadline of the question set

The server expects the following GET parameters:

- `token`: The login token associated with the current session, e.g. `12345678`
- `id`: The ID number associated with the question set, e.g. `17`

The server may return any of the following status codes or 5xx on error:

- `200 OK`
- `400 Bad Request`
- `403 Forbidden`
- `404 Not Found`

#### `200 OK`

The requested operation was successful. The server should respond with a JSON payload representing the question set:

- `"title"`: A title describing the nature of the question set, e.g. `"GNU/Linux trivia"`
- `"description"`: A longer description of what the question set is about, e.g. `"A sample problem set on fun facts about GNU/Linux, used for demonstrating the app only"`
- `"problems"`: A non-empty array of objects, each with the following fields:
  - `"question"`: The problem statement, e.g. `"What is Linux?"`
  - `"answers"`: An array of length 4 where each element is a string representing a possible answer to the question, e.g. `["An operating system kernel", "A fully functioning operating system", "A brand of potato chips", "A top secret project under development by Microsoft"]`. The first item in the array is taken as the correct answer

#### `400 Bad Request`

The request was malformed, e.g. the ID provided was not a whole number. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The ID provided was not a whole number"`

#### `403 Forbidden`

A privileged user attempted the operation, the user already has a score associated with the graded question set or the graded question set was requested past its deadline. It is acceptable to return `404 Not Found` instead to conceal sensitive information from potential attackers.

The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"You requested to train on a graded question set past its deadline"`

#### `404 Not Found`

Any other user error. The server should return a JSON payload containing the following fields:

- `"message"`: A short description of the error, e.g. `"The requested resource was not found"`
