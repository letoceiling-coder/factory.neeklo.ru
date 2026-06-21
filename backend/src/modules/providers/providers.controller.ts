import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { ProviderCredentialsService } from '../../integrations/provider-credentials.service';
import { Roles } from '../auth/decorators';

class UpsertProviderDto {
  @IsString() type!: 'llm' | 'tts' | 'avatar' | 'storage';
  @IsString() slug!: string;
  @IsString() label!: string;
  @IsOptional() @IsString() apiKey?: string;
  @IsOptional() @IsObject() config?: Record<string, any>;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

const KNOWN = [
  { slug: 'openrouter', type: 'llm', label: 'OpenRouter' },
  { slug: 'elevenlabs', type: 'tts', label: 'ElevenLabs' },
  { slug: 'heygen', type: 'avatar', label: 'HeyGen' },
  { slug: 'hedra', type: 'avatar', label: 'Hedra' },
  { slug: 'did', type: 'avatar', label: 'D-ID' },
  { slug: 'selectel', type: 'storage', label: 'Selectel S3' },
];

@Controller('providers')
@Roles('admin')
export class ProvidersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly creds: ProviderCredentialsService,
  ) {}

  @Get()
  async list() {
    const rows = await this.prisma.provider.findMany();
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    return KNOWN.map((k) => {
      const row = bySlug.get(k.slug);
      const decrypted = row ? this.crypto.decrypt(row.apiKeyEnc) : null;
      return {
        slug: k.slug,
        type: k.type,
        label: row?.label || k.label,
        enabled: row?.enabled ?? true,
        configured: !!decrypted,
        keyMask: this.crypto.mask(decrypted),
        config: row?.config || {},
      };
    });
  }

  @Get(':slug/status')
  async status(@Param('slug') slug: string) {
    const c = await this.creds.resolve(slug);
    return { slug, configured: !!c.apiKey, enabled: c.enabled };
  }

  @Put(':slug')
  async upsert(@Param('slug') slug: string, @Body() dto: UpsertProviderDto) {
    const known = KNOWN.find((k) => k.slug === slug);
    const apiKeyEnc = dto.apiKey ? this.crypto.encrypt(dto.apiKey) : undefined;
    const row = await this.prisma.provider.upsert({
      where: { slug },
      create: {
        slug,
        type: (dto.type || known?.type || 'llm') as any,
        label: dto.label || known?.label || slug,
        apiKeyEnc: apiKeyEnc || null,
        config: dto.config || {},
        enabled: dto.enabled ?? true,
      },
      update: {
        label: dto.label,
        config: dto.config,
        enabled: dto.enabled,
        ...(apiKeyEnc ? { apiKeyEnc } : {}),
      },
    });
    return { slug: row.slug, enabled: row.enabled };
  }
}
