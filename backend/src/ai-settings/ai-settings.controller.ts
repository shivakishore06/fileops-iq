import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';

@Controller('api/v1/ai-settings')
export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get()
  getSettings() {
    return this.aiSettingsService.getSettings();
  }

  @Post()
  upsert(@Body() body: { provider: string; modelName: string; apiKey?: string }) {
    return this.aiSettingsService.upsert(body);
  }

  @Delete()
  remove() {
    return this.aiSettingsService.remove();
  }
}
