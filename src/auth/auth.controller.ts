import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdmLoginDto, EmployeeLoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login/admin')
  async login(@Body() loginDto: AdmLoginDto) {
    return this.authService.admLogin(loginDto.email, loginDto.password);
  }

  @Post('login/employee')
  async employeeLogin(@Body() loginDto: EmployeeLoginDto) {
    return this.authService.employeeLogin(loginDto.email, loginDto.password);
  }
}
