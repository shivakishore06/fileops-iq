import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FileExplorerService } from './file-explorer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/files/explorer')
export class FileExplorerController {
  constructor(private readonly fileExplorerService: FileExplorerService) {}

  @Get('search')
  @Permissions('file:read')
  search(
    @Query('filename') filename?: string,
    @Query('status') status?: string,
    @Query('connectionId') connectionId?: string,
    @Query('extension') extension?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.fileExplorerService.search({
      filename,
      status,
      connectionId,
      extension,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });
  }

  @Get('stats')
  @Permissions('file:read')
  getFileStats() {
    return this.fileExplorerService.getFileStats();
  }

  @Get(':fileId/lifecycle')
  @Permissions('file:read')
  getLifecycleTimeline(@Param('fileId') fileId: string) {
    return this.fileExplorerService.getLifecycleTimeline(fileId);
  }

  @Get(':fileId/events')
  @Permissions('file:read')
  getFileEvents(@Param('fileId') fileId: string) {
    return this.fileExplorerService.getFileEvents(fileId);
  }
}
