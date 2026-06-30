import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ConnectionModule } from './connection/connection.module';
import { BullModule } from '@nestjs/bullmq';
import { MonitorModule } from './monitor/monitor.module';
import { AlertModule } from './alert/alert.module';
import { SlaModule } from './sla/sla.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FileModule } from './file/file.module';
import { CopilotModule } from './copilot/copilot.module';
import { AuditModule } from './audit/audit.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionModule } from './retention/retention.module';
import { FeatureFlagModule } from './feature-flag/feature-flag.module';
import { AiSettingsModule } from './ai-settings/ai-settings.module';
import { StoragePolicyModule } from './storage-policy/storage-policy.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    RetentionModule,
    FeatureFlagModule,
    AiSettingsModule,
    StoragePolicyModule,
    HealthModule,
    PrismaModule,
    TenantModule,
    AuthModule,
    CommonModule,
    ConnectionModule,
    MonitorModule,
    AlertModule,
    SlaModule,
    AnalyticsModule,
    FileModule,
    CopilotModule,
    AuditModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
