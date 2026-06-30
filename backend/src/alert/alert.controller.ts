import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AlertService } from './alert.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  @Permissions('alert:read')
  async findAll() {
    return this.alertService.findAll();
  }

  @Post(':id/acknowledge')
  @Permissions('alert:write')
  async acknowledge(@Param('id') id: string) {
    return this.alertService.acknowledge(id);
  }

  @Post(':id/resolve')
  @Permissions('alert:write')
  async resolve(@Param('id') id: string) {
    return this.alertService.resolve(id);
  }
}
