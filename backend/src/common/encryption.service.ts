import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY || '32bytekeyforaesencryptionhere!!!';
    // Ensure the key is exactly 32 bytes
    this.key = Buffer.alloc(32);
    const secretBuffer = Buffer.from(secret, 'utf-8');
    secretBuffer.copy(this.key, 0, 0, Math.min(secretBuffer.length, 32));
  }

  encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:encryptedText:tag
    return `${iv.toString('hex')}:${encrypted}:${tag}`;
  }

  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const tag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
