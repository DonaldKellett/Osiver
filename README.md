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

## Credits

The reference implementation of Osiver is built on top of [Osiv](https://github.com/DonaldKellett/Osiv) which is licensed under the [GPLv3](https://github.com/DonaldKellett/Osiv/blob/main/LICENSE) or later.

## License

GPLv3 or any later version at your discretion
