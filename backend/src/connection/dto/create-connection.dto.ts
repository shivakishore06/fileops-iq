import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max, IsUUID, IsJSON } from 'class-validator';

export enum ConnectionType {
  SFTP = 'SFTP',
  FTP = 'FTP',
  FTPS = 'FTPS',
  S3 = 'S3',
  AZURE = 'AZURE',
  SHAREPOINT = 'SHAREPOINT',
  FOLDER = 'FOLDER',
  API = 'API',
}

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ConnectionType)
  type: ConnectionType;

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
  @Min(5) // min 5 seconds polling interval
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
