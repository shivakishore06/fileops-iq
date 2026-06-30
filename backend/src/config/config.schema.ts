import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().uri().required().description('PostgreSQL connection string'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().min(16).required().description('JWT signing secret'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().description('JWT refresh token secret'),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required().description('AES-256 encryption key (32 bytes)'),

  // Server
  APP_PORT: Joi.number().port().default(3001),
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),
  LOG_FORMAT: Joi.string().valid('text', 'json').default('text'),

  // MinIO / Object Storage
  MINIO_ENDPOINT: Joi.string().default('http://localhost:9000'),
  MINIO_ACCESS_KEY: Joi.string().default('minio_admin'),
  MINIO_SECRET_KEY: Joi.string().default('minio_password'),
  MINIO_BUCKET: Joi.string().default('fileops-bucket'),

  // AI
  AI_PROVIDER: Joi.string().valid('openai', 'anthropic', 'gemini', 'ollama').default('openai'),
  AI_API_KEY: Joi.string().allow('').default(''),
  AI_MODEL: Joi.string().default('gpt-4o'),

  // SMTP
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().default('noreply@fileops-iq.com'),

  // Feature Flags
  FF_AI_COPILOT: Joi.boolean().default(true),
  FF_RETENTION_ENGINE: Joi.boolean().default(true),
  FF_FILE_EXPLORER: Joi.boolean().default(true),
});
