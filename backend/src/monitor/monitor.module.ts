import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitorScheduler } from './monitor.scheduler';
import { PollingProcessor } from './processors/polling.processor';
import { ProcessingProcessor } from './processors/processing.processor';
import { ConnectionModule } from '../connection/connection.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConnectionModule,
    BullModule.registerQueue(
      { name: 'file-polling' },
      { name: 'file-processing' }
    ),
  ],
  providers: [MonitorScheduler, PollingProcessor, ProcessingProcessor],
  exports: [MonitorScheduler],
})
export class MonitorModule {}
