import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RetentionService } from './retention.service';

@Controller('api/v1/retention')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Post()
  create(@Body() body: { name: string; pattern: string; ageDays: number; action: string }) {
    return this.retentionService.create(body);
  }

  @Get()
  findAll() {
    return this.retentionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.retentionService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; pattern?: string; ageDays?: number; action?: string; isActive?: boolean },
  ) {
    return this.retentionService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.retentionService.remove(id);
  }

  @Post('evaluate')
  triggerEvaluation() {
    return this.retentionService.evaluatePolicies();
  }
}
