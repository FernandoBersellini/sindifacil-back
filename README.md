# Sindifacil

This app is a document management system for a single Brazilian worker's
union (Sindifacil). It has a frontend and a backend.
Frontend is made with Next.js + TypeScript.
Backend is made with NestJS + PostgreSQL + TypeScript + TypeORM.

This repo is only the backend.
The frontend is in the repository: https://github.com/FernandoBersellini/sindifacil-front

For development conventions, architecture notes, and the rules behind the
privilege/role system, see [CLAUDE.md](CLAUDE.md) and [docs/](docs/)
(per-feature API notes for the frontend).

# The problem

The union has a huge amount of physical paper documents ("fichas"). When an
associate requests a document, a union employee has to search for it by
hand among that paper archive and send it to the associate. This is slow,
and the paper itself is deteriorating with age — documents are being lost.

# The solution

A web application that lets union staff digitize those documents, manage
associate records, and retrieve/search everything without touching the
physical archive.

# Scope

This project is single-tenant: it is being built for one specific worker's
union, not as a distributed/multi-tenant system for multiple unions or
organizations.

# Backend

- NestJS + PostgreSQL + TypeScript + TypeORM
- Base URL: `http://localhost:5555/api/v1` (port from `process.env.PORT`,
  defaults to `5555`; global prefix `/api/v1`)

## Running locally

```bash
npm install
npm run start:dev      # watch mode
```

Copy [.env.example](.env.example) to `.env` and fill it in:

- `DB_PASSWORD` — Postgres password (`sindifacil_db` on `localhost:5432`,
  user `postgres`)
- `JWT_SECRET` — signs auth tokens (the app refuses to start without it)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — seeds the first `ADMIN` user on
  startup if the `users` table has no active admin yet
- `PORT` — optional, defaults to `5555`

## Domains

There is a single authenticatable `User` entity with a `role` column
(`ADMIN` | `EMPLOYEE`) — not separate admin/employee tables. `ADMIN` can
manage users; `EMPLOYEE` manages associates and documents. See
[CLAUDE.md](CLAUDE.md) for the full privilege model.

- **Users** (`/users/*`, admin-only) — create/list/update/deactivate users,
  change roles.
- **Associates** (`/associate/*`) — one record per union associate, mirrors
  the physical "ficha" (name, CPF, birth date, parents' names, registration
  number).
- **Documents** (`/documents/*`) — scanned files attached to an associate;
  upload/list/download/replace file/delete, plus a list of documents still
  awaiting allocation (`/documents/pending`). Storage is local disk today,
  behind a `StorageProvider` interface so it can later move to R2/S3.
- **Mappings** (`/mappings/*`) — physical location (cabinet + drawer) of
  each document's paper ficha in the archive: suggest the next free drawer,
  allocate, move, unallocate, list by cabinet/drawer, and per-drawer
  occupancy (capacity 100). The archive layout is configured in
  [src/mapping/archive.config.ts](src/mapping/archive.config.ts).
- **Auth** (`/auth/login`) — single login route for every role; the role is
  read off the user row and signed into the JWT.

Detailed request/response shapes, validation rules, and known gaps for each
of these live in [docs/](docs/):
[auth.md](docs/auth.md), [associates.md](docs/associates.md),
[documents.md](docs/documents.md), [mapping.md](docs/mapping.md).
Note: `docs/` is currently git-ignored, so these files exist only locally.

# Frontend

- Next.js + TypeScript
- Dev origin: `http://localhost:3000` (the only CORS origin currently
  allowed by the backend, see [src/main.ts](src/main.ts))

# General conventions

- App language: Portuguese (Brazil)
- Date format: `DD/MM/YYYY`
- CPF format: `000.000.000-00` (validated server-side via check digits, see
  [src/utils/cpf-validator.ts](src/utils/cpf-validator.ts))
