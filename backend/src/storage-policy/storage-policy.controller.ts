import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { StoragePolicyService } from './storage-policy.service';

@Controller('api/v1/storage-policies')
export class StoragePolicyController {
  constructor(private readonly storagePolicyService: StoragePolicyService) {}

  @Post()
  create(@Body() body: { name: string; provider: string; bucketName: string; region?: string; isActive?: boolean }) {
    return this.storagePolicyService.create(body);
  }

  @Get()
  findAll() {
    return this.storagePolicyService.findAll();
  }

  @Get('active')
  getActivePolicy() {
    return this.storagePolicyService.getActivePolicy();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storagePolicyService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; provider?: string; bucketName?: string; region?: string; isActive?: boolean },
  ) {
    return this.storagePolicyService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storagePolicyService.remove(id);
  }
}
