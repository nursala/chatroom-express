# Exercise 5 – ChatRoom (Express)

## Project Description
A simple chat room web application built with Node.js and Express.
Includes:
- User registration (two-step with 30s timeout using cookies)
- Login with session-based authentication
- Tab-based session protection (single active tab)
- Chat page with polling and database search
- Edit/Delete allowed only for the message owner
- System messages (join/leave)

## Technologies
- Node.js + Express
- EJS (views)
- Sequelize + MariaDB
- Bootstrap (CDN)

## Authors

Developed by **Noor Salah** and **Amer Abu Sair** as university coursework. This is an independent portfolio copy; the original Classroom submission is preserved.

## Run locally

Install Node.js, npm and Docker. From the project root:

```sh
npm ci
export DB_PASSWORD='choose-a-local-password'
export SESSION_SECRET='choose-a-long-random-local-secret'
docker compose -f mydatabase-docker/docker-compose.yml up -d
npm start
```

On PowerShell use `$env:DB_PASSWORD="..."` and `$env:SESSION_SECRET="..."`. Open http://localhost:3000. The application uses MariaDB on port 3306 with database `mydb` and user `root` by default. Optional variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`.

## Scope

Academic demonstration with polling and session authentication. Review session storage and deployment security before production use. Grading reports and personal contact details are excluded from this public copy.
