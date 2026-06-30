import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CopilotService } from './copilot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

class AskQueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('ask')
  @Permissions('file:read')
  async ask(@Body() dto: AskQueryDto) {
    return this.copilotService.handleQuery(dto.query);
  }
}
