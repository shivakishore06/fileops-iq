import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';

@Controller('api/v1/feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Post()
  create(@Body() body: { key: string; value?: boolean; description?: string }) {
    return this.featureFlagService.create(body);
  }

  @Get()
  findAll() {
    return this.featureFlagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featureFlagService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { value?: boolean; description?: string },
  ) {
    return this.featureFlagService.update(id, body);
  }

  @Put(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.featureFlagService.toggle(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.featureFlagService.remove(id);
  }
}
