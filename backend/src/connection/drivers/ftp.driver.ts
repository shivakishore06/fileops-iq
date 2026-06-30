import { IStorageDriver, RemoteFile, ConnectionTestResult } from './storage-driver.interface';
import * as ftp from 'basic-ftp';
import { Readable, Writable } from 'stream';

export class FtpDriver implements IStorageDriver {
  constructor(
    private readonly config: {
      host: string;
      port?: number;
      username?: string;
      password?: string;
      secure?: boolean;
    },
  ) {}

  private async getClient(): Promise<ftp.Client> {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    await client.access({
      host: this.config.host,
      port: this.config.port || 21,
      user: this.config.username || 'anonymous',
      password: this.config.password || 'anonymous',
      secure: this.config.secure ?? false,
      secureOptions: {
        rejectUnauthorized: false,
      },
    });
    return client;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const client = new ftp.Client();
    try {
      await client.access({
        host: this.config.host,
        port: this.config.port || 21,
        user: this.config.username || 'anonymous',
        password: this.config.password || 'anonymous',
        secure: this.config.secure ?? false,
        secureOptions: {
          rejectUnauthorized: false,
        },
      });
      await client.pwd();
      return { success: true, message: 'FTP connection established successfully.' };
    } catch (err: any) {
      return { success: false, message: `FTP connection failed: ${err.message}` };
    } finally {
      client.close();
    }
  }

  async listDirectory(remotePath = '/'): Promise<RemoteFile[]> {
    const client = await this.getClient();
    try {
      const list = await client.list(remotePath || '/');
      return list.map((item) => ({
        filename: item.name,
        path: remotePath ? `${remotePath}/${item.name}`.replace(/\/+/g, '/') : item.name,
        size: BigInt(item.size),
        lastModified: item.modifiedAt ? new Date(item.modifiedAt) : new Date(),
        isDirectory: item.isDirectory,
      }));
    } catch (err: any) {
      throw new Error(`FTP listDirectory failed: ${err.message}`);
    } finally {
      client.close();
    }
  }

  async downloadFile(remotePath: string): Promise<NodeJS.ReadableStream> {
    const client = await this.getClient();
    try {
      const stream = new Readable({
        read() {},
      });

      // basic-ftp requires downloading to a Writable stream.
      // We can download into a buffer, then push to readable, or download to a temp stream.
      // A quick buffer-based writable stream is safe for average sized integration files.
      const chunks: any[] = [];
      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      await client.downloadTo(writable, remotePath);
      
      const buffer = Buffer.concat(chunks);
      stream.push(buffer);
      stream.push(null); // EOF

      return stream;
    } catch (err: any) {
      throw new Error(`FTP downloadFile failed: ${err.message}`);
    } finally {
      client.close();
    }
  }

  async uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    const client = await this.getClient();
    try {
      // basic-ftp expects a Readable stream
      await client.uploadFrom(stream as Readable, remotePath);
    } catch (err: any) {
      throw new Error(`FTP uploadFile failed: ${err.message}`);
    } finally {
      client.close();
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.remove(remotePath);
    } catch (err: any) {
      throw new Error(`FTP deleteFile failed: ${err.message}`);
    } finally {
      client.close();
    }
  }
}
