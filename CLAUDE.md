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

Server runs on `http://localhost:3001`, global prefix `/api/v1`. CORS is currently hardcoded in [src/main.ts](src/main.ts) to allow only `http://localhost:3002` (the frontend dev origin).

## Architecture

Standard Nest module-per-domain layout under `src/`: each domain (`employee/`, `associate/`, `adm/`, `auth/`) has its own `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, and `entities/`. `AppModule` ([src/app.module.ts](src/app.module.ts)) wires everything together and configures TypeORM directly inline (Postgres, `synchronize: true`, `autoLoadEntities: true`) — there is no separate database config module or migrations setup yet.

### Two login actors, not a unified user model

Per the UML design, there are two distinct authenticatable actors with separate tables and no shared `User` base entity:

- **Adm** ([src/adm/entities/adm.entity.ts](src/adm/entities/adm.entity.ts)) — the union administrator. Intentionally a single hardcoded row (email + password only); there is no CRUD for admins and none should be added.
- **Employee** ([src/employee/entities/employee.entity.ts](src/employee/entities/employee.entity.ts)) — union staff who operate the system day-to-day. Has full CRUD via `EmployeeController`/`EmployeeService`.

`AuthModule` ([src/auth/](src/auth/)) is the login entry point for both actors (`admLogin` / `employeeLogin` on `AuthService`). Role is intended to be set at JWT sign-time based on which login path succeeded — there is deliberately **no `role` column** on either entity. Note the current state: `AuthController` exposes no HTTP routes yet, `employeeLogin` is a stub, and there is no actual JWT issuance (`admLogin` returns a literal `"token"` string) — this is in-progress scaffolding, not a working auth flow.

### Associate entity mirrors the physical archive

`Associate` ([src/associate/entities/associate.entity.ts](src/associate/entities/associate.entity.ts)) fields (`name`, `birthDate`, `mothersName`, `fathersName`, `registrationNumber`) are driven directly by the fields present on the physical paper "ficha" archive being digitized — when extending this entity, check against the physical form rather than inventing new fields. `storageKey`, `originalFilename`, `mimeType`, `uploadedAt` are metadata for the associated scanned document file; actual file storage (planned: R2/S3) is not yet implemented, so these columns are currently unused placeholders.

### Controller route conventions

Controllers use explicit action-named subpaths rather than bare REST verbs on the resource root, e.g. `POST /employees/create`, `GET /employees/list`, `GET /employees/detail/:id`, `PATCH /employees/update/:id`, `DELETE /employees/remove/:id`. Follow this pattern for new endpoints on existing or new resources rather than switching to bare `POST /employees`, `GET /employees/:id`, etc.

### DTOs

DTOs are plain classes (not currently using `class-validator` decorators or `@nestjs/mapped-types`' `PartialType` for updates — update DTOs are hand-written with optional fields). Keep new DTOs consistent with this style unless a broader validation approach is deliberately introduced.
