import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service';
import { RetentionController } from './retention.controller';
import { RetentionScheduler } from './retention.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RetentionController],
  providers: [RetentionService, RetentionScheduler],
  exports: [RetentionService],
})
export class RetentionModule {}
