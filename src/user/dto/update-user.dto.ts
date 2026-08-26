import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Sem o campo role de propósito: a troca de papel passa apenas por
// PATCH /users/role/:id, para não abrir escalonamento de privilégio aqui.
export class UpdateUserDto extends PartialType(CreateUserDto) {
  name?: string;
  cpf?: string;
  email?: string;
  password?: string;
  active?: boolean;
}
