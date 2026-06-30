import { IStorageDriver, RemoteFile, ConnectionTestResult } from './storage-driver.interface';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Readable } from 'stream';

export class AzureBlobDriver implements IStorageDriver {
  private containerClient: ContainerClient;

  constructor(config: { connectionString: string; containerName: string }) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    this.containerClient = blobServiceClient.getContainerClient(config.containerName);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const exists = await this.containerClient.exists();
      if (!exists) {
        // Attempt to create if not exists
        await this.containerClient.create();
      }
      return { success: true, message: `Successfully connected to Azure container: ${this.containerClient.containerName}` };
    } catch (err: any) {
      return { success: false, message: `Azure Blob storage test failed: ${err.message}` };
    }
  }

  async listDirectory(remotePath = ''): Promise<RemoteFile[]> {
    try {
      const files: RemoteFile[] = [];
      const prefix = remotePath ? (remotePath.endsWith('/') ? remotePath : `${remotePath}/`) : '';

      for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
        const filename = blob.name.replace(prefix, '');
        
        // Simulating folders by checking if path contains sub-directories
        const isSubFolder = filename.includes('/');
        const resolvedName = isSubFolder ? filename.split('/')[0] : filename;
        const resolvedPath = isSubFolder ? `${prefix}${resolvedName}/` : blob.name;

        // Dedup directories
        if (isSubFolder) {
          const alreadyAdded = files.some(f => f.isDirectory && f.path === resolvedPath);
          if (!alreadyAdded) {
            files.push({
              filename: resolvedName,
              path: resolvedPath,
              size: BigInt(0),
              lastModified: blob.properties.lastModified || new Date(),
              isDirectory: true,
            });
          }
        } else {
          files.push({
            filename: resolvedName,
            path: resolvedPath,
            size: BigInt(blob.properties.contentLength || 0),
            lastModified: blob.properties.lastModified || new Date(),
            isDirectory: false,
          });
        }
      }

      return files;
    } catch (err: any) {
      throw new Error(`Azure Blob listDirectory failed: ${err.message}`);
    }
  }

  async downloadFile(remotePath: string): Promise<NodeJS.ReadableStream> {
    try {
      const blobClient = this.containerClient.getBlobClient(remotePath);
      const downloadResponse = await blobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('Azure Blob download response body is empty');
      }

      return downloadResponse.readableStreamBody;
    } catch (err: any) {
      throw new Error(`Azure Blob downloadFile failed: ${err.message}`);
    }
  }

  async uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(remotePath);
      
      // Azure SDK expects a readable stream or buffer.
      // We can upload using uploadStream.
      // We need to convert NodeJS.ReadableStream to readable stream.
      await blockBlobClient.uploadStream(stream as Readable);
    } catch (err: any) {
      throw new Error(`Azure Blob uploadFile failed: ${err.message}`);
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    try {
      const blobClient = this.containerClient.getBlobClient(remotePath);
      await blobClient.delete();
    } catch (err: any) {
      throw new Error(`Azure Blob deleteFile failed: ${err.message}`);
    }
  }
}
