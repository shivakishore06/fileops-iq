import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { IStorageDriver, RemoteFile, ConnectionTestResult } from './storage-driver.interface';
import { Readable } from 'stream';

export class S3Driver implements IStorageDriver {
  private s3: S3Client;
  private bucket: string;

  constructor(config: {
    bucketName: string;
    region?: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // e.g. 'http://localhost:9000' for MinIO
  }) {
    this.bucket = config.bucketName;
    this.s3 = new S3Client({
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint || undefined,
      forcePathStyle: !!config.endpoint, // Needed for MinIO/Local stack
    });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { success: true, message: `Successfully connected to S3 bucket: ${this.bucket}` };
    } catch (err: any) {
      return { success: false, message: `S3 access failed: ${err.message}` };
    }
  }

  async listDirectory(remotePath = ''): Promise<RemoteFile[]> {
    try {
      const prefix = remotePath ? (remotePath.endsWith('/') ? remotePath : `${remotePath}/`) : '';
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          Delimiter: '/',
        })
      );

      const files: RemoteFile[] = [];

      // Add common prefixes (folders)
      if (response.CommonPrefixes) {
        for (const dir of response.CommonPrefixes) {
          if (dir.Prefix) {
            const folderName = dir.Prefix.replace(prefix, '').replace('/', '');
            files.push({
              filename: folderName,
              path: dir.Prefix,
              size: BigInt(0),
              lastModified: new Date(),
              isDirectory: true,
            });
          }
        }
      }

      // Add objects (files)
      if (response.Contents) {
        for (const item of response.Contents) {
          // Skip the folder prefix object itself if returned
          if (item.Key === prefix) continue;

          if (item.Key) {
            const filename = item.Key.replace(prefix, '');
            files.push({
              filename,
              path: item.Key,
              size: BigInt(item.Size || 0),
              lastModified: item.LastModified || new Date(),
              isDirectory: false,
            });
          }
        }
      }

      return files;
    } catch (err: any) {
      throw new Error(`S3 directory list failed: ${err.message}`);
    }
  }

  async downloadFile(remotePath: string): Promise<NodeJS.ReadableStream> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: remotePath,
        })
      );

      if (response.Body instanceof Readable) {
        return response.Body;
      }
      
      throw new Error('S3 response body is not a readable stream');
    } catch (err: any) {
      throw new Error(`S3 download failed: ${err.message}`);
    }
  }

  async uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    try {
      // In a production app, we would use S3 multipart upload stream logic.
      // For standard files, buffer conversion is safe or we stream directly to body.
      // S3 SDK v3 PutObjectCommand accepts readable stream as body directly, but requires content length
      // or falls back to chunked transfer encoding (which S3 supports but some configurations require size).
      // Let's convert to buffer to avoid transfer encoding bugs if size is needed.
      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: remotePath,
          Body: buffer,
        })
      );
    } catch (err: any) {
      throw new Error(`S3 upload failed: ${err.message}`);
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: remotePath,
        })
      );
    } catch (err: any) {
      throw new Error(`S3 delete failed: ${err.message}`);
    }
  }
}
