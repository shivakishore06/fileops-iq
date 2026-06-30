import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsUUID, IsJSON } from 'class-validator';
import { ConnectionType } from './create-connection.dto';

export class UpdateConnectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ConnectionType)
  type?: ConnectionType;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  privateKey?: string;

  @IsOptional()
  @IsJSON()
  configJson?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  pollingInterval?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeout?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  retryLimit?: number;

  @IsOptional()
  @IsString()
  encryptionType?: string;

  @IsOptional()
  @IsString()
  proxySettings?: string;
}
