import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'src/utils/role';
import { JwtPayload } from '../strategies/jwt.strategy';

// O administrador acumula todos os acessos do funcionário.
const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [Role.ADMIN]: [Role.ADMIN, Role.EMPLOYEE],
  [Role.EMPLOYEE]: [Role.EMPLOYEE],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const grantedRoles = ROLE_HIERARCHY[request.user?.role] ?? [];
    return requiredRoles.some((role) => grantedRoles.includes(role));
  }
}
