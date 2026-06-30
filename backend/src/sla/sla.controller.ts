import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SlaService } from './sla.service';
import { CreateSlaDto } from './dto/create-sla.dto';
import { UpdateSlaDto } from './dto/update-sla.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/sla')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Post()
  @Permissions('sla:write')
  async create(@Body() dto: CreateSlaDto) {
    return this.slaService.create(dto);
  }

  @Get()
  @Permissions('sla:read')
  async findAll() {
    return this.slaService.findAll();
  }

  @Get(':id')
  @Permissions('sla:read')
  async findOne(@Param('id') id: string) {
    return this.slaService.findOne(id);
  }

  @Put(':id')
  @Permissions('sla:write')
  async update(@Param('id') id: string, @Body() dto: UpdateSlaDto) {
    return this.slaService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('sla:write')
  async remove(@Param('id') id: string) {
    return this.slaService.remove(id);
  }
}
