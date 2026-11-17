import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/utils/role';
import { JwtPayload } from 'src/auth/strategies/jwt.strategy';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYEE)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
  ) {
    return this.documentService.create(
      +createDocumentDto.associateId,
      file,
      req.user.id,
    );
  }

  @Patch('replace/:id')
  @UseInterceptors(FileInterceptor('file'))
  replaceFile(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
  ) {
    return this.documentService.replaceFile(+id, file, req.user.id);
  }

  @Get('list/:associateId')
  findAllByAssociate(@Param('associateId') associateId: string) {
    return this.documentService.findAllByAssociate(+associateId);
  }

  @Get('pending')
  findPending() {
    return this.documentService.findPending();
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(+id);
  }

  @Get('download/:id')
  async downloadFile(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { document, stream } = await this.documentService.downloadFile(+id);
    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${document.originalFileName}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete('remove/:id')
  remove(@Param('id') id: string) {
    return this.documentService.remove(+id);
  }
}
