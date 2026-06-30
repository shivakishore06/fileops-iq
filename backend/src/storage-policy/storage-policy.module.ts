import { Module } from '@nestjs/common';
import { StoragePolicyService } from './storage-policy.service';
import { StoragePolicyController } from './storage-policy.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StoragePolicyController],
  providers: [StoragePolicyService],
  exports: [StoragePolicyService],
})
export class StoragePolicyModule {}
