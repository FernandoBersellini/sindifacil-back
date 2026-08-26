import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/utils/role';
import { JwtPayload } from 'src/auth/strategies/jwt.strategy';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('list/employees')
  findAllEmployees() {
    return this.userService.findAllEmployees();
  }

  @Get('list/admins')
  findAllAdmins() {
    return this.userService.findAllAdmins();
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch('update/:id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Patch('role/:id')
  changeRole(@Param('id') id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.userService.changeRole(+id, changeRoleDto.role);
  }

  @Delete('remove/:id')
  remove(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.userService.remove(+id, req.user.id);
  }
}
