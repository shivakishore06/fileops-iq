import { IStorageDriver, RemoteFile, ConnectionTestResult } from './storage-driver.interface';
import { Storage, Bucket } from '@google-cloud/storage';
import { Readable } from 'stream';

export class GcsDriver implements IStorageDriver {
  private storage: Storage;
  private bucket: Bucket;

  constructor(config: { projectId: string; keyFilename?: string; credentialsJson?: string; bucketName: string }) {
    let options: any = { projectId: config.projectId };
    
    if (config.keyFilename) {
      options.keyFilename = config.keyFilename;
    } else if (config.credentialsJson) {
      try {
        options.credentials = JSON.parse(config.credentialsJson);
      } catch {
        // Fallback
      }
    }

    this.storage = new Storage(options);
    this.bucket = this.storage.bucket(config.bucketName);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        return { success: false, message: `Bucket ${this.bucket.name} does not exist.` };
      }
      return { success: true, message: `Successfully connected to GCS bucket: ${this.bucket.name}` };
    } catch (err: any) {
      return { success: false, message: `GCS access failed: ${err.message}` };
    }
  }

  async listDirectory(remotePath = ''): Promise<RemoteFile[]> {
    try {
      const files: RemoteFile[] = [];
      const prefix = remotePath ? (remotePath.endsWith('/') ? remotePath : `${remotePath}/`) : '';

      const [gcsFiles] = await this.bucket.getFiles({
        prefix,
        delimiter: '/',
      });

      for (const file of gcsFiles) {
        // Skip directory itself if returned
        if (file.name === prefix) continue;

        const filename = file.name.replace(prefix, '');
        const isDirectory = file.name.endsWith('/');

        files.push({
          filename: isDirectory ? filename.replace('/', '') : filename,
          path: file.name,
          size: BigInt(file.metadata.size || 0),
          lastModified: file.metadata.updated ? new Date(file.metadata.updated as string) : new Date(),
          isDirectory,
        });
      }

      return files;
    } catch (err: any) {
      throw new Error(`GCS listDirectory failed: ${err.message}`);
    }
  }

  async downloadFile(remotePath: string): Promise<NodeJS.ReadableStream> {
    try {
      const file = this.bucket.file(remotePath);
      return file.createReadStream();
    } catch (err: any) {
      throw new Error(`GCS downloadFile failed: ${err.message}`);
    }
  }

  async uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    try {
      const file = this.bucket.file(remotePath);
      const writeStream = file.createWriteStream();

      return new Promise((resolve, reject) => {
        stream.pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });
    } catch (err: any) {
      throw new Error(`GCS uploadFile failed: ${err.message}`);
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    try {
      const file = this.bucket.file(remotePath);
      await file.delete();
    } catch (err: any) {
      throw new Error(`GCS deleteFile failed: ${err.message}`);
    }
  }
}
