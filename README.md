# Osiver

Backend server for the Reviso mobile application

## Overview

Reviso is a mobile application allowing students to achieve mastery through repetition by training on question sets and track their own progress over time, as well as allowing teachers to track students' progress and create graded question sets to assess students' abilities. Osiver is the backend server API for Reviso, featuring two types of users:

- Teachers responsible for creating question sets
- Students responsible for training on question sets

Students can freely sign up for an account, while teachers can only sign up for an account with proper authorization from the server administrator through a master password.

## Why the name?

Osiver is Reviso spelled backwards, which matches its role as a backend for the mobile application ;-)

## API

This is the application programming interface (API) exposed to the client by a server that respects the Osiver API. See API.md for more details.

## Getting Started

The reference implementation of Osiver in this repo is written in Node.js with Fastify and depends on an MySQL database for storing account information.

### From source

1. Clone/download the repo to your Web server with Node.js installed: `$ git clone https://github.com/DonaldKellett/Osiver.git`
1. Change directory to the root of this repo: `$ cd /path/to/your/Osiver`
1. Ensure you have administrative access to a server with MySQL installed and running
1. Run the `osiver.sql` script on the MySQL server as the MySQL root user, e.g. you would do this on CentOS 8 Stream: `$ mysql -u root -p < /path/to/your/Osiver/osiver.sql`
1. Back in your Web server, edit `config/db-host` to point to the IP address or hostname of your MySQL server (if located elsewhere from your Web server)
1. (Recommended) Run suitable queries on the MySQL server to change the password for the MySQL `osiver` user (default: `P@ssw0rd`) and update `config/db-pw` accordingly to instruct the Web server to connect to the database server using this new password
1. (Recommended) Edit `config/jwt-secret` and `config/master-pw` accordingly to set a new JWT secret and master password respectively
1. (Optional) Edit `config/timeout` to modify the login timeout for users
1. Ensuring that you are in the root directory of this repo, run `$ npm install` to install all the required Node.js modules and dependencies
1. Run `$ npm start` to start the Web server at port 3000 and enjoy :-)

The behavior of the Web server can be further configured via three environment variables:

- `OSIVER_CONF_BASE`: Controls where the Web server reads its configuration. Defaults to `/path/to/your/Osiver/config`
- `OSIVER_DATA_BASE`: Controls where the Web server stores variable state information. Defaults to `/path/to/your/Osiver/data`
- `PORT`: Controls which port the Web server listens to. Defaults to 3000

## Known Issues

- The `GET /logout` endpoint does not actually invalidate the JWT login token since JWT tokens cannot be invalidated and maintaining a blacklist of invalidated tokens in-memory violates the REST principle. This should not pose a major security risk as long as the client discards the login token on logout and prevents it from leaking to untrusted third parties before the token expires. But then, Osiver is not meant for production use out-of-the-box anyway since it uses HTTP by default instead of HTTPS, voiding any and all security guarantees (-:

## Credits

The reference implementation of Osiver is built on top of [Osiv](https://github.com/DonaldKellett/Osiv) which is licensed under the [GPLv3](https://github.com/DonaldKellett/Osiv/blob/main/LICENSE) or later.

## License

GPLv3 or any later version at your discretion
