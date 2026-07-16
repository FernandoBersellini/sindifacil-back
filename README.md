# Sindifacil
  This app is a document management system for worker unions in Brazil.
  It has a frontend and a backend.  
  Frontend is made with Next.js + TypeScript.  
  Backend is made with NestJS + PostgreSQL + TypeScript + Typeorm.

  This repo is only the backend.
  The frontend is in the repository: https://github.com/FernandoBersellini/sindifacil-front

# The problem
The problem is that the worker's union needs a system to manage their documents, they have a huge amount of physical documents, and when a associate requests a document, a union member needs to search for it in a huge amount of physical documents, and send it to the worker. This is a very time consuming and inefficient process. And furthermore, due to the age of the documents, the paper is deteriorating, and the documents are being lost.

# The solution
The solution is a web application that allows the worker's union to manage their documents, digitize them, and make them available to the workers. 

# Scope
This project is single-tenant: it is being built for one specific worker's union, not as a distributed/multi-tenant system for multiple unions or organizations.

# Backend 
 - NestJS + PostgreSQL + TypeScript + Typeorm

### Backend URLs
- Base url: http://localhost:3001/api/v1

#### Employees
- Create: POST http://localhost:3001/api/v1/employees/create
- List: GET http://localhost:3001/api/v1/employees/list
- Detail: GET http://localhost:3001/api/v1/employees/detail/:id
- Update: PATCH http://localhost:3001/api/v1/employees/update/:id
- Remove: DELETE http://localhost:3001/api/v1/employees/remove/:id

### DTOs

#### CreateEmployeeDTO
```ts
export interface CreateEmployeeDTO {
  name: string;
  cpf: string;
  birthDate: Date;
}
```

#### UpdateEmployeeDTO
```ts
export interface UpdateEmployeeDTO {
  name?: string;
  cpf?: string;
  birthDate?: Date;
}
```

# Frontend
 - Next.js + TypeScript

### Frontend URLs
- Base url: http://localhost:3002

# General
- App language: Portuguese - Brazil
- Date format: DD/MM/YYYY
- CPF format: 000.000.000-00

## Database

### Table: employees

Columns:
 - id: uuid (primary key)
 - name: varchar
 - cpf: varchar
 - birthDate: date

