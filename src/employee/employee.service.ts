import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) { }

  async create(createEmployeeDto: CreateEmployeeDto) {
    createEmployeeDto.password = await(bcrypt.hash(createEmployeeDto.password, 10));
    return this.employeeRepository.save(createEmployeeDto);
  }

  findAll() {
    return this.employeeRepository.find();
  }

  findOne(id: number) {
    return this.employeeRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.employeeRepository.findOne({ where: { email } });
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    if (updateEmployeeDto.password) {
      updateEmployeeDto.password = await bcrypt.hash(updateEmployeeDto.password, 10);
    }
    return this.employeeRepository.update(id, updateEmployeeDto);
  }

  remove(id: number) {
    return this.employeeRepository.delete(id);
  }
}
