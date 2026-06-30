import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  // Setup Winston logger options
  const isProduction = process.env.NODE_ENV === 'production';
  const logFormat = process.env.LOG_FORMAT || 'text';

  const logger = WinstonModule.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          logFormat === 'json'
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
              ),
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger });

  const configService = app.get(ConfigService);

  // Configure dynamic CORS based on environment variables
  const corsOrigins = configService.get<string>('CORS_ORIGINS') || 'http://localhost:3000';
  const origins = corsOrigins.split(',').map(origin => origin.trim());

  app.enableCors({
    origin: origins.includes('*') ? '*' : origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('FileOps IQ - Enterprise API')
    .setDescription('Enterprise File Operations & Analytics Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Enable Graceful Shutdown hooks
  app.enableShutdownHooks();

  const port = configService.get<number>('APP_PORT') || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api/docs`);
}
bootstrap();
