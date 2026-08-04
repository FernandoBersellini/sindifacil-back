import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdmLoginDto, EmployeeLoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from 'src/utils/role';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login/admin')
  @Roles(Role.ADMIN)
  async login(@Body() loginDto: AdmLoginDto) {
    return this.authService.admLogin(loginDto.email, loginDto.password);
  }

  @Post('login/employee')
  @Roles(Role.USER)
  async employeeLogin(@Body() loginDto: EmployeeLoginDto) {
    return this.authService.employeeLogin(loginDto.email, loginDto.password);
  }
}
