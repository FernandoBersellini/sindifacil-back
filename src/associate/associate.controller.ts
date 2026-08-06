import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AssociateService } from './associate.service';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/utils/role';

@Controller('associate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
export class AssociateController {
  constructor(private readonly associateService: AssociateService) {}

  @Post()
  create(@Body() createAssociateDto: CreateAssociateDto) {
    return this.associateService.create(createAssociateDto);
  }

  @Get()
  findAll() {
    return this.associateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.associateService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssociateDto: UpdateAssociateDto) {
    return this.associateService.update(+id, updateAssociateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.associateService.remove(+id);
  }
}
