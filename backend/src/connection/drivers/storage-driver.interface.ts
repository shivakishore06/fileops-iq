export interface RemoteFile {
  filename: string;
  path: string;
  size: bigint;
  lastModified: Date;
  isDirectory: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface IStorageDriver {
  testConnection(): Promise<ConnectionTestResult>;
  listDirectory(remotePath?: string): Promise<RemoteFile[]>;
  downloadFile(remotePath: string): Promise<NodeJS.ReadableStream>;
  uploadFile(remotePath: string, stream: NodeJS.ReadableStream): Promise<void>;
  deleteFile(remotePath: string): Promise<void>;
}
