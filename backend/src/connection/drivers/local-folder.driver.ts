import { IStorageDriver, RemoteFile, ConnectionTestResult } from './storage-driver.interface';
import * as fs from 'fs';
import * as path from 'path';

export class LocalFolderDriver implements IStorageDriver {
  constructor(private readonly basePath: string) {}

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      if (!this.basePath) {
        return { success: false, message: 'Base path is empty' };
      }
      // Check read & write permissions
      await fs.promises.access(this.basePath, fs.constants.R_OK | fs.constants.W_OK);
      return { success: true, message: 'Local folder path exists with read/write access.' };
    } catch (err: any) {
      return { success: false, message: `Access failed: ${err.message}` };
    }
  }

  async listDirectory(remotePath = ''): Promise<RemoteFile[]> {
    const fullPath = path.resolve(path.join(this.basePath, remotePath));
    // Secure sandbox check: prevent directory traversal outside basePath
    if (!fullPath.startsWith(path.resolve(this.basePath))) {
      throw new Error('Access denied: directory traversal detected');
    }

    try {
      const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
      const files: RemoteFile[] = [];

      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name);
        const stats = await fs.promises.stat(entryPath);

        files.push({
          filename: entry.name,
          path: path.join(remotePath, entry.name),
          size: BigInt(stats.size),
          lastModified: stats.mtime,
          isDirectory: entry.isDirectory(),
        });
      }

      return files;
    } catch (err: any) {
      throw new Error(`Failed to list directory contents: ${err.message}`);
    }
  }

  async downloadFile(remotePath: string): Promise<NodeJS.ReadableStream> {
    const fullPath = path.resolve(path.join(this.basePath, remotePath));
    if (!fullPath.startsWith(path.resolve(this.basePath))) {
      throw new Error('Access denied: directory traversal detected');
    }
    return fs.createReadStream(fullPath);
  }

  async uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    const fullPath = path.resolve(path.join(this.basePath, remotePath));
    if (!fullPath.startsWith(path.resolve(this.basePath))) {
      throw new Error('Access denied: directory traversal detected');
    }

    // Ensure target folder structure exists
    const targetDir = path.dirname(fullPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const writeStream = fs.createWriteStream(fullPath);
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  async deleteFile(remotePath: string): Promise<void> {
    const fullPath = path.resolve(path.join(this.basePath, remotePath));
    if (!fullPath.startsWith(path.resolve(this.basePath))) {
      throw new Error('Access denied: directory traversal detected');
    }
    await fs.promises.unlink(fullPath);
  }
}
