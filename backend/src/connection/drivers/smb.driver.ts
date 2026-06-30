import { IStorageDriver, RemoteFile, ConnectionTestResult } from './storage-driver.interface';

export class SmbDriver implements IStorageDriver {
  constructor(
    private readonly config: {
      share: string;
      domain?: string;
      username?: string;
      password?: string;
    },
  ) {}

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: false,
      message: 'SMB/CIFS connection driver is placeholder only. Native binaries required.',
    };
  }

  async listDirectory(remotePath = ''): Promise<RemoteFile[]> {
    throw new Error('SMB listDirectory: not implemented on macOS client environments.');
  }

  async downloadFile(remotePath: string): Promise<NodeJS.ReadableStream> {
    throw new Error('SMB downloadFile: not implemented.');
  }

  async uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    throw new Error('SMB uploadFile: not implemented.');
  }

  async deleteFile(remotePath: string): Promise<void> {
    throw new Error('SMB deleteFile: not implemented.');
  }
}
