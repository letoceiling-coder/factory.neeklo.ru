import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM symmetric encryption for provider API keys at rest.
 * Format stored: base64(iv).base64(authTag).base64(ciphertext)
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('APP_ENCRYPTION_KEY') || 'dev-insecure-key';
    // Accept 64-char hex, otherwise derive a 32-byte key via sha256.
    this.key =
      /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : crypto.createHash('sha256').update(raw).digest();
  }

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
  }

  decrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    try {
      const [ivB64, tagB64, dataB64] = payload.split('.');
      const iv = Buffer.from(ivB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  }

  mask(plain: string | null | undefined): string {
    if (!plain) return '';
    if (plain.length <= 8) return '••••';
    return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
  }
}
