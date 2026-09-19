import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Role } from 'src/utils/role';
import { isValidCpf } from 'src/utils/cpf-validator';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if ((await this.countAdmins()) > 0) {
      return;
    }

    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn(
        'Nenhum administrador cadastrado e ADMIN_EMAIL/ADMIN_PASSWORD não definidos. Administrador inicial não criado.',
      );
      return;
    }

    await this.userRepository.save(
      this.userRepository.create({
        name: 'Administrador',
        email,
        password: await bcrypt.hash(password, 10),
        role: Role.ADMIN,
      }),
    );

    this.logger.log(`Administrador inicial criado: ${email}`);
  }

  async create(createUserDto: CreateUserDto) {
    if (!isValidCpf(createUserDto.cpf)) {
      throw new ConflictException('CPF inválido');
    }

    const user = await this.userRepository.save(
      this.userRepository.create({
        name: createUserDto.name,
        cpf: createUserDto.cpf,
        email: createUserDto.email,
        password: await bcrypt.hash(createUserDto.password, 10),
        role: Role.EMPLOYEE,
      }),
    );
    return this.findOne(user.id);
  }

  findAllEmployees() {
    return this.userRepository.find({ where: { role: Role.EMPLOYEE } });
  }

  findAllAdmins() {
    return this.userRepository.find({ where: { role: Role.ADMIN } });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // Único ponto que expõe o hash da senha — a coluna é select: false.
  async findByEmailForAuth(email: string) {
    return this.userRepository
      .createQueryBuilder('users')
      .addSelect('users.password')
      .where('users.email = :email', { email })
      .getOne();
  }

  countAdmins() {
    return this.userRepository.countBy({ role: Role.ADMIN, active: true });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (updateUserDto.active === false) {
      await this.assertNotLastAdmin(user, 'desativar');
    }

    if (updateUserDto.cpf !== undefined && !isValidCpf(updateUserDto.cpf)) {
      throw new ConflictException('CPF inválido');
    }

    const changes: QueryDeepPartialEntity<User> = {};
    if (updateUserDto.name !== undefined) changes.name = updateUserDto.name;
    if (updateUserDto.cpf !== undefined) changes.cpf = updateUserDto.cpf;
    if (updateUserDto.email !== undefined) changes.email = updateUserDto.email;
    if (updateUserDto.active !== undefined)
      changes.active = updateUserDto.active;
    if (updateUserDto.password) {
      changes.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (Object.keys(changes).length > 0) {
      await this.userRepository.update(id, changes);
    }

    return this.findOne(id);
  }

  async changeRole(id: number, role: Role) {
    const user = await this.findOne(id);

    if (user.role === role) {
      return user;
    }

    if (role !== Role.ADMIN) {
      await this.assertNotLastAdmin(user, 'rebaixar');
    }

    await this.userRepository.update(id, { role });
    return this.findOne(id);
  }

  async remove(id: number, actingUserId: number) {
    const user = await this.findOne(id);

    if (id === actingUserId) {
      throw new ForbiddenException(
        'Você não pode excluir a própria conta. Peça a outro administrador.',
      );
    }

    await this.assertNotLastAdmin(user, 'excluir');
    await this.userRepository.delete(id);
    return user;
  }

  private async assertNotLastAdmin(user: User, action: string) {
    if (user.role !== Role.ADMIN || !user.active) {
      return;
    }

    if ((await this.countAdmins()) <= 1) {
      throw new ConflictException(
        `Não é possível ${action} o último administrador. Promova outro usuário antes.`,
      );
    }
  }
}
