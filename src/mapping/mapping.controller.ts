import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MappingService } from './mapping.service';
import { AllocateMappingDto } from './dto/allocate-mapping.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/utils/role';
import { JwtPayload } from 'src/auth/strategies/jwt.strategy';

const documentIdPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException('Identificador de documento inválido'),
});

@Controller('mappings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYEE)
export class MappingController {
  constructor(private readonly mappingService: MappingService) {}

  @Get('suggest/:documentId')
  suggest(@Param('documentId', documentIdPipe) documentId: number) {
    return this.mappingService.suggest(documentId);
  }

  @Post('allocate/:documentId')
  allocate(
    @Param('documentId', documentIdPipe) documentId: number,
    @Body() allocateMappingDto: AllocateMappingDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.mappingService.allocate(
      documentId,
      allocateMappingDto,
      req.user.id,
    );
  }

  @Get('detail/:documentId')
  findByDocument(@Param('documentId', documentIdPipe) documentId: number) {
    return this.mappingService.findByDocument(documentId);
  }

  @Get('list')
  list(@Query('cabinet') cabinet?: string, @Query('drawer') drawer?: string) {
    return this.mappingService.list(cabinet, drawer);
  }

  @Get('occupancy')
  occupancy() {
    return this.mappingService.getOccupancy();
  }

  @Patch('update/:documentId')
  update(
    @Param('documentId', documentIdPipe) documentId: number,
    @Body() updateMappingDto: UpdateMappingDto,
  ) {
    return this.mappingService.update(documentId, updateMappingDto);
  }

  @Delete('remove/:documentId')
  remove(@Param('documentId', documentIdPipe) documentId: number) {
    return this.mappingService.remove(documentId);
  }
}
