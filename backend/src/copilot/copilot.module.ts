import { Module } from '@nestjs/common';
import { CopilotService } from './copilot.service';
import { CopilotController } from './copilot.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CopilotService],
  controllers: [CopilotController],
  exports: [CopilotService],
})
export class CopilotModule {}
