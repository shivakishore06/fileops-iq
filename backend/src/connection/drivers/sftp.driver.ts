import Client from 'ssh2-sftp-client';
import { IStorageDriver, RemoteFile, ConnectionTestResult } from './storage-driver.interface';
import { Readable } from 'stream';

export class SftpDriver implements IStorageDriver {
  constructor(private readonly config: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
  }) {}

  private async getConnectedClient(): Promise<Client> {
    const client = new Client();
    const connectConfig: any = {
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.username,
    };

    if (this.config.privateKey) {
      connectConfig.privateKey = this.config.privateKey;
    } else if (this.config.password) {
      connectConfig.password = this.config.password;
    }

    await client.connect(connectConfig);
    return client;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    let client: Client | null = null;
    try {
      client = await this.getConnectedClient();
      const currentDir = await client.cwd();
      return { success: true, message: `SFTP Connection successful. Default dir: ${currentDir}` };
    } catch (err: any) {
      return { success: false, message: `SFTP Connection failed: ${err.message}` };
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  async listDirectory(remotePath = '.'): Promise<RemoteFile[]> {
    let client: Client | null = null;
    try {
      client = await this.getConnectedClient();
      const list = await client.list(remotePath);
      
      return list.map(item => ({
        filename: item.name,
        path: remotePath === '.' ? item.name : `${remotePath}/${item.name}`,
        size: BigInt(item.size),
        lastModified: new Date(item.modifyTime),
        isDirectory: item.type === 'd',
      }));
    } catch (err: any) {
      throw new Error(`SFTP list failed: ${err.message}`);
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  async downloadFile(remotePath: string): Promise<NodeJS.ReadableStream> {
    const client = await this.getConnectedClient();
    try {
      const stream = await client.get(remotePath);
      
      // Auto close client when stream finishes or throws error
      if (stream instanceof Readable) {
        stream.on('end', () => client.end());
        stream.on('error', () => client.end());
        return stream;
      }
      
      // If client.get returns a Buffer or string instead of a stream
      const readable = new Readable();
      readable.push(stream);
      readable.push(null);
      readable.on('end', () => client.end());
      return readable;
    } catch (err: any) {
      await client.end();
      throw new Error(`SFTP download failed: ${err.message}`);
    }
  }

  async uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    const client = await this.getConnectedClient();
    try {
      // ssh2-sftp-client put method supports passing streams
      await client.put(stream as any, remotePath);
    } catch (err: any) {
      throw new Error(`SFTP upload failed: ${err.message}`);
    } finally {
      await client.end();
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    const client = await this.getConnectedClient();
    try {
      await client.delete(remotePath);
    } catch (err: any) {
      throw new Error(`SFTP delete failed: ${err.message}`);
    } finally {
      await client.end();
    }
  }
}
