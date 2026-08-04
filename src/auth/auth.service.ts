import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Adm } from 'src/adm/entities/adm.entity';
import { AdmService } from 'src/adm/adm.service';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly admService: AdmService,
    ) {

    }

    async admSignUp(email: string, password: string) {
        const adm = await this.admService.findByEmail(email)

        if (adm) {
            throw new Error("Adm já cadastrado")
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newAdm = await this.admService.create({id: 0, email, password: hashedPassword })

        const token = "token"

        const authResponse: AuthResponseDto = {
            token,
            userId: newAdm.id,
            userRole: "adm",
            email: newAdm.email
        }

        return authResponse
    }

    async admLogin(email: string, password: string) {
        const adm = await this.admService.findByEmail(email)

        if (!adm) {
            throw new Error("Adm não encontrado")
        } 

        if (!(await bcrypt.compare(password, adm.password))) {
            throw new Error("Senha incorreta")
        }

        const token = "token"

        const authResponse: AuthResponseDto = {
            token,
            userId: adm.id,
            userRole: "adm",
            email: adm.email
        }

        return authResponse
    }

    async employeeLogin(email: string, password: string) {
        return "employee login"
    }
}
