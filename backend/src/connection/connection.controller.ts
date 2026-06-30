import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { DriverFactory } from './drivers/driver.factory';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/connections')
export class ConnectionController {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly driverFactory: DriverFactory,
  ) {}

  @Post()
  @Permissions('connection:create')
  async create(@Body() dto: CreateConnectionDto) {
    return this.connectionService.create(dto);
  }

  @Get()
  @Permissions('connection:read')
  async findAll(@Query('type') type?: string) {
    return this.connectionService.findAll(type);
  }

  @Get(':id')
  @Permissions('connection:read')
  async findOne(@Param('id') id: string) {
    return this.connectionService.findOne(id);
  }

  @Put(':id')
  @Permissions('connection:write')
  async update(@Param('id') id: string, @Body() dto: UpdateConnectionDto) {
    return this.connectionService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('connection:write')
  async remove(@Param('id') id: string) {
    return this.connectionService.remove(id);
  }

  @Post(':id/test')
  @Permissions('connection:write')
  async testConnection(@Param('id') id: string) {
    try {
      const driver = await this.driverFactory.getDriver(id);
      const result = await driver.testConnection();
      await this.connectionService.updateStatus(id, result.success ? 'ACTIVE' : 'ERROR');
      return result;
    } catch (err: any) {
      await this.connectionService.updateStatus(id, 'ERROR');
      return { success: false, message: err.message };
    }
  }
}
