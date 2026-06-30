import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { StorageService } from './storage.service';
import { RealtimeGateway } from './realtime.gateway';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

@Global()
@Module({
  providers: [EncryptionService, StorageService, RealtimeGateway, CorrelationIdMiddleware],
  exports: [EncryptionService, StorageService, RealtimeGateway],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
