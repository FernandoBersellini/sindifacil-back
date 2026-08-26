# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sindifacil backend: a document management system for a single Brazilian worker's union (Sindifacil). The union has a large physical archive of paper documents ("fichas") that need to be digitized and made searchable/retrievable by associates and union employees. This repo is the NestJS backend only; the Next.js frontend lives in a separate repo (`sindifacil-front`).

This is a **single-tenant** system built for one specific union — do not introduce multi-tenancy abstractions (org/tenant IDs, etc.).

App-facing conventions: Portuguese (Brazil) for user-facing text/errors, dates as `DD/MM/YYYY`, CPF formatted as `000.000.000-00`.

## Commands

```bash
npm run start:dev      # run with watch mode (primary dev loop)
npm run start:debug    # watch mode with debugger attached
npm run build           # nest build
npm run lint             # eslint --fix over src/apps/libs/test
npm run format           # prettier --write over src/ and test/

npm test                    # jest unit tests (*.spec.ts, colocated with source)
npm run test:watch
npm run test:cov
npm run test:e2e            # jest -c test/jest-e2e.json

# run a single test file
npx jest path/to/file.spec.ts
```

Server listens on `process.env.PORT ?? 5555`, global prefix `/api/v1`. CORS is currently hardcoded in [src/main.ts](src/main.ts) to allow only `http://localhost:3000` (the frontend dev origin).

## Architecture

Standard Nest module-per-domain layout under `src/`: each domain (`user/`, `associate/`, `document/`, `auth/`) has its own `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, and `entities/`. `AppModule` ([src/app.module.ts](src/app.module.ts)) wires everything together and configures TypeORM directly inline (Postgres, `synchronize: true`, `autoLoadEntities: true`) — there is no separate database config module or migrations setup yet.

### One `User` entity, role as a column

There is a single authenticatable actor: `User` ([src/user/entities/user.entity.ts](src/user/entities/user.entity.ts)), carrying a `role` column of `Role.ADMIN` | `Role.EMPLOYEE` ([src/utils/role.ts](src/utils/role.ts)).

This replaced an earlier design with two separate tables (`Adm` and `Employee`) and no shared base entity. Admin-ness was a *table*, which meant the union's administration could not be handed to another person without editing the database by hand. It is now an attribute of a user, transferable through the API. Do not reintroduce a separate admin table.

- **ADMIN** — manages users. `UserController` is admin-only in full.
- **EMPLOYEE** — union staff operating the system day-to-day: associates and documents.

`RolesGuard` ([src/auth/guards/roles.guard.ts](src/auth/guards/roles.guard.ts)) applies a hierarchy — **ADMIN satisfies any `@Roles(Role.EMPLOYEE)` check**. Annotate shared routes with `@Roles(Role.EMPLOYEE)` alone; do not list both roles.

`AuthModule` ([src/auth/](src/auth/)) exposes a single `POST /auth/login` for everyone; the role is read off the user row and signed into the JWT. There is no separate admin login route.

Privilege rules enforced in `UserService` ([src/user/user.service.ts](src/user/user.service.ts)):

- `role` is **not** settable through `POST /users/create` or `PATCH /users/update/:id` — only through the dedicated admin-only `PATCH /users/role/:id`. Because there is no global `ValidationPipe`, request bodies arrive unfiltered, so these methods copy fields one at a time rather than spreading the DTO. Keep that pattern; spreading would let a client-supplied `role` reach the database.
- The last active ADMIN cannot be demoted, deactivated, or deleted (`ConflictException`).
- A user cannot delete their own account (`ForbiddenException`). Self-demotion *is* allowed once another admin exists — that is the intended handoff: promote the successor, then step down.
- `password` is `select: false`; only `findByEmailForAuth` reads it. Login rejects `active: false` users.

On startup `UserService.onModuleInit` seeds the first ADMIN from `ADMIN_EMAIL` / `ADMIN_PASSWORD` when the table holds no active admin, and logs a warning if those env vars are missing.

### Associate entity mirrors the physical archive

`Associate` ([src/associate/entities/associate.entity.ts](src/associate/entities/associate.entity.ts)) fields (`name`, `birthDate`, `mothersName`, `fathersName`, `registrationNumber`) are driven directly by the fields present on the physical paper "ficha" archive being digitized — when extending this entity, check against the physical form rather than inventing new fields. `storageKey`, `originalFilename`, `mimeType`, `uploadedAt` are metadata for the associated scanned document file; actual file storage (planned: R2/S3) is not yet implemented, so these columns are currently unused placeholders.

### Controller route conventions

Controllers use explicit action-named subpaths rather than bare REST verbs on the resource root, e.g. `POST /users/create`, `GET /users/list`, `GET /users/detail/:id`, `PATCH /users/update/:id`, `DELETE /users/remove/:id`. Follow this pattern for new endpoints on existing or new resources rather than switching to bare `POST /users`, `GET /users/:id`, etc. (`AssociateController` predates the convention and still uses bare verbs.)

### DTOs

DTOs are plain classes with **no `class-validator` decorators**, and there is no global `ValidationPipe` in [src/main.ts](src/main.ts). Update DTOs extend `PartialType` from `@nestjs/mapped-types` *and* restate their fields as optional. Keep new DTOs consistent with this style unless a broader validation approach is deliberately introduced.

Because nothing validates or strips request bodies at runtime, a DTO's type is **not** a runtime guarantee — extra client-supplied fields reach the service untouched. Any service handling a privilege-bearing or otherwise sensitive field must copy fields explicitly instead of spreading the DTO into `save()`/`update()`; see `UserService.create`/`update`.
