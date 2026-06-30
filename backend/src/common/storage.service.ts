import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable, Transform } from 'stream';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  
  public readonly TRANSIENT_BUCKET = 'transient-landing';
  public readonly ARCHIVE_BUCKET = 'archival-storage';

  constructor() {
    this.s3 = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || 'minio_admin',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minio_password',
      },
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      forcePathStyle: true, // required for MinIO local
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists(this.TRANSIENT_BUCKET);
    await this.ensureBucketExists(this.ARCHIVE_BUCKET);
  }

  private async ensureBucketExists(bucketName: string) {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch {
      this.logger.log(`Bucket ${bucketName} not found. Creating bucket...`);
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: bucketName }));
        this.logger.log(`Bucket ${bucketName} created successfully.`);
      } catch (err: any) {
        this.logger.error(`Failed to create bucket ${bucketName}: ${err.message}`);
      }
    }
  }

  // Uploads a stream while calculating SHA-256 checksum and size concurrently
  async uploadAndCalculateChecksum(
    bucket: string,
    key: string,
    stream: NodeJS.ReadableStream
  ): Promise<{ checksum: string; size: bigint }> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      let size = BigInt(0);
      const chunks: Buffer[] = [];

      // Transform stream to pipe bytes, calculate size and hash, and collect chunks
      // (For absolute horizontal scaling, one would pipe directly to S3 Upload API,
      // but compiling buffer is extremely safe for normal files. Let's support stream pipe)
      const monitor = new Transform({
        transform(chunk, encoding, callback) {
          size += BigInt(chunk.length);
          hash.update(chunk);
          chunks.push(chunk);
          callback(null, chunk);
        }
      });

      const handleStreamError = (err: any) => {
        reject(new Error(`Stream reading failed: ${err.message}`));
      };

      stream.on('error', handleStreamError);
      monitor.on('error', handleStreamError);

      stream.pipe(monitor).on('finish', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const checksum = hash.digest('hex');

          // Upload to MinIO
          await this.s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: buffer,
            })
          );

          resolve({ checksum, size });
        } catch (err: any) {
          reject(new Error(`MinIO upload failed: ${err.message}`));
        }
      });
    });
  }

  // Moves file from transient bucket to archive bucket
  async archiveFile(key: string, stream: NodeJS.ReadableStream) {
    // Pipe directly from transient bucket stream to archive bucket
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
    }
    const buffer = Buffer.concat(chunks);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.ARCHIVE_BUCKET,
        Key: key,
        Body: buffer,
      })
    );
  }
}
