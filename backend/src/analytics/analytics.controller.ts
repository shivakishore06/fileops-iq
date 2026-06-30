import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  @Permissions('file:read')
  async getKpis() {
    return this.analyticsService.getDashboardKpis();
  }

  @Get('trends')
  @Permissions('file:read')
  async getTrends() {
    return this.analyticsService.getVolumeTrends();
  }

  @Get('partners')
  @Permissions('file:read')
  async getPartners() {
    return this.analyticsService.getPartnerPerformance();
  }

  @Post('report')
  @Permissions('file:download')
  async generateReport() {
    return this.analyticsService.generateCsvReport();
  }
}
