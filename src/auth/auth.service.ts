import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userService.findByEmailForAuth(email);

    // Mesma mensagem para usuário inexistente e senha errada,
    // para não revelar quais e-mails estão cadastrados.
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    const authResponse: AuthResponseDto = {
      token,
      userId: user.id,
      userRole: user.role,
      email: user.email,
    };

    return authResponse;
  }
}
