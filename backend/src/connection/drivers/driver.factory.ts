import { Injectable, BadRequestException } from '@nestjs/common';
import { ConnectionService } from '../connection.service';
import { IStorageDriver } from './storage-driver.interface';
import { LocalFolderDriver } from './local-folder.driver';
import { SftpDriver } from './sftp.driver';
import { S3Driver } from './s3.driver';
import { FtpDriver } from './ftp.driver';
import { AzureBlobDriver } from './azure-blob.driver';
import { GcsDriver } from './gcs.driver';
import { SmbDriver } from './smb.driver';

@Injectable()
export class DriverFactory {
  constructor(private readonly connectionService: ConnectionService) {}

  async getDriver(connectionId: string): Promise<IStorageDriver> {
    const conn = await this.connectionService.getDecryptedCredentials(connectionId);
    
    // Parse config options
    let config: any = {};
    if (conn.configJson) {
      try {
        config = JSON.parse(conn.configJson);
      } catch {
        throw new BadRequestException('Invalid JSON format in connection configuration');
      }
    }

    switch (conn.type) {
      case 'FOLDER':
        if (!config.path) {
          throw new BadRequestException('Local folder path is missing in connection config');
        }
        return new LocalFolderDriver(config.path);
        
      case 'SFTP':
        if (!conn.host || !conn.username) {
          throw new BadRequestException('SFTP host and username are required');
        }
        return new SftpDriver({
          host: conn.host,
          port: conn.port || 22,
          username: conn.username,
          password: conn.password || undefined,
          privateKey: conn.privateKey || undefined,
        });

      case 'FTP':
      case 'FTPS':
        if (!conn.host) {
          throw new BadRequestException('FTP/FTPS host is required');
        }
        return new FtpDriver({
          host: conn.host,
          port: conn.port || 21,
          username: conn.username || undefined,
          password: conn.password || undefined,
          secure: conn.type === 'FTPS',
        });

      case 'S3':
        if (!config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
          throw new BadRequestException('S3 bucketName, accessKeyId, and secretAccessKey are required');
        }
        return new S3Driver({
          bucketName: config.bucketName,
          region: config.region,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          endpoint: config.endpoint,
        });

      case 'AZURE':
        if (!config.connectionString || !config.containerName) {
          throw new BadRequestException('Azure connectionString and containerName are required');
        }
        return new AzureBlobDriver({
          connectionString: config.connectionString,
          containerName: config.containerName,
        });

      case 'SHAREPOINT':
        if (!config.projectId || !config.bucketName) {
          throw new BadRequestException('GCS/Sharepoint config is missing required keys');
        }
        return new GcsDriver({
          projectId: config.projectId,
          keyFilename: config.keyFilename,
          credentialsJson: config.credentialsJson,
          bucketName: config.bucketName,
        });

      case 'API':
        return new SmbDriver({
          share: config.share || '',
          domain: config.domain,
          username: conn.username || undefined,
          password: conn.password || undefined,
        });

      default:
        throw new BadRequestException(`Unsupported connection type: ${conn.type}`);
    }
  }
}
