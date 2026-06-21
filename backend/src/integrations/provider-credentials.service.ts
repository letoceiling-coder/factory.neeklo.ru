import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../shared/crypto/encryption.service';

export interface ResolvedCredential {
  apiKey: string | null;
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Resolves provider credentials: prefers the encrypted DB Provider row,
 * falls back to environment variables.
 */
@Injectable()
export class ProviderCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  private envFallback(slug: string): { apiKey: string | null; config: Record<string, any> } {
    switch (slug) {
      case 'openrouter':
        return {
          apiKey: this.config.get('OPENROUTER_API_KEY') || null,
          config: {
            baseUrl: this.config.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1',
            defaultModel: this.config.get('OPENROUTER_DEFAULT_MODEL') || 'openai/gpt-4o-mini',
          },
        };
      case 'elevenlabs':
        return {
          apiKey: this.config.get('ELEVENLABS_API_KEY') || null,
          config: { baseUrl: this.config.get('ELEVENLABS_BASE_URL') || 'https://api.elevenlabs.io' },
        };
      case 'heygen':
        return {
          apiKey: this.config.get('HEYGEN_API_KEY') || null,
          config: { baseUrl: this.config.get('HEYGEN_BASE_URL') || 'https://api.heygen.com' },
        };
      case 'hedra':
        return {
          apiKey: this.config.get('HEDRA_API_KEY') || null,
          config: { baseUrl: this.config.get('HEDRA_BASE_URL') || 'https://api.hedra.com' },
        };
      case 'did':
        return {
          apiKey: this.config.get('DID_API_KEY') || null,
          config: { baseUrl: this.config.get('DID_BASE_URL') || 'https://api.d-id.com' },
        };
      case 'selectel':
        return {
          apiKey: this.config.get('S3_SECRET_KEY') || null,
          config: {
            endpoint: this.config.get('S3_ENDPOINT'),
            region: this.config.get('S3_REGION'),
            bucket: this.config.get('S3_BUCKET'),
            accessKey: this.config.get('S3_ACCESS_KEY'),
            publicBaseUrl: this.config.get('S3_PUBLIC_BASE_URL'),
          },
        };
      default:
        return { apiKey: null, config: {} };
    }
  }

  async resolve(slug: string): Promise<ResolvedCredential> {
    const fallback = this.envFallback(slug);
    const row = await this.prisma.provider.findUnique({ where: { slug } }).catch(() => null);
    if (!row) {
      return { apiKey: fallback.apiKey, config: fallback.config, enabled: true };
    }
    const dbKey = this.crypto.decrypt(row.apiKeyEnc);
    return {
      apiKey: dbKey || fallback.apiKey,
      config: { ...fallback.config, ...((row.config as Record<string, any>) || {}) },
      enabled: row.enabled,
    };
  }
}
