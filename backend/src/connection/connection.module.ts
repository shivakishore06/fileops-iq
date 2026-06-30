import { Module } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { ConnectionController } from './connection.controller';
import { AuthModule } from '../auth/auth.module';
import { DriverFactory } from './drivers/driver.factory';

@Module({
  imports: [AuthModule],
  providers: [ConnectionService, DriverFactory],
  controllers: [ConnectionController],
  exports: [ConnectionService, DriverFactory],
})
export class ConnectionModule {}
