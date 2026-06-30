import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FileService } from './file.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get()
  @Permissions('file:read')
  async search(
    @Query('filename') filename?: string,
    @Query('status') status?: string,
    @Query('checksum') checksum?: string,
    @Query('connectionId') connectionId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.fileService.searchFiles({
      filename,
      status,
      checksum,
      connectionId,
      partnerId,
      startDate,
      endDate,
      limit,
      offset,
    });
  }

  @Get(':id')
  @Permissions('file:read')
  async getDetails(@Param('id') id: string) {
    return this.fileService.getFileDetails(id);
  }
}
