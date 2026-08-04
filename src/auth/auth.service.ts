import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdmService } from 'src/adm/adm.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/utils/role';
import { EmployeeService } from 'src/employee/employee.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly admService: AdmService,
        private readonly jwtService: JwtService,
        private readonly employeeService: EmployeeService
    ) {

    }

    async admLogin(email: string, password: string) {
        const adm = await this.admService.findByEmail(email)

        if (!adm) {
            throw new UnauthorizedException("Credenciais inválidas")
        }

        if (!(await bcrypt.compare(password, adm.password))) {
            throw new UnauthorizedException("Credenciais inválidas")
        }

       const payload = {
        id: adm.id,
        email: adm.email,
        role: Role.ADMIN
       }

       const token = await this.jwtService.signAsync(payload)

        const authResponse: AuthResponseDto = {
            token,
            userId: adm.id,
            userRole: Role.ADMIN,
            email: adm.email
        }

        return authResponse
    }

    async employeeLogin(email: string, password: string) {
        const user = await this.employeeService.findByEmail(email)

        if (!user) {
            throw new UnauthorizedException("Credenciais inválidas")
        }

        if (!(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException("Credenciais inválidas")
        }

       const payload = {
        id: user.id,
        email: user.email,
        role: Role.USER
       }

       const token = await this.jwtService.signAsync(payload)

        const authResponse: AuthResponseDto = {
            token,
            userId: user.id,
            userRole: Role.USER,
            email: user.email
        }

        return authResponse
    }
}
