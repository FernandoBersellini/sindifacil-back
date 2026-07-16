import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
    name?: string;
    cpf?: string;
    birthDate?: Date;
    email?: string;
    password?: string;
    active?: boolean;
}
