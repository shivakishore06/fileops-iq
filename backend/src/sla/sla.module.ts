import { Module } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { AlertModule } from '../alert/alert.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AlertModule, AuthModule],
  providers: [SlaService],
  controllers: [SlaController],
  exports: [SlaService],
})
export class SlaModule {}
