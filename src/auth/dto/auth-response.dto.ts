import { Role } from 'src/utils/role';

export class AuthResponseDto {
    token: string
    userId: number
    userRole: Role
    email: string
}
