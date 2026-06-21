import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';

class UpsertAvatarDto {
  @IsString() name!: string;
  @IsOptional() @IsString() engine?: 'heygen' | 'hedra' | 'did';
  @IsOptional() @IsString() engineAvatarId?: string;
  @IsOptional() @IsString() kind?: 'preset' | 'photo' | 'cloned' | 'custom';
  @IsOptional() @IsString() sourceImageKey?: string;
  @IsOptional() @IsString() previewUrl?: string;
  @IsOptional() @IsString() defaultVoiceId?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsObject() meta?: Record<string, any>;
}

@Controller('avatars')
export class AvatarsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private async enrich<T extends { sourceImageKey?: string | null; previewUrl?: string | null }>(avatar: T) {
    if (!avatar) return avatar;
    if (avatar.sourceImageKey) {
      const url = await this.s3.getPresignedUrl(avatar.sourceImageKey, 6 * 3600).catch(() => null);
      return { ...avatar, previewUrl: url || avatar.previewUrl };
    }
    return avatar;
  }

  @Get()
  async list() {
    const rows = await this.prisma.avatar.findMany({ orderBy: { createdAt: 'desc' } });
    return Promise.all(rows.map((r) => this.enrich(r)));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const row = await this.prisma.avatar.findUnique({ where: { id } });
    return this.enrich(row!);
  }

  @Post()
  async create(@Body() dto: UpsertAvatarDto) {
    const row = await this.prisma.avatar.create({
      data: {
        name: dto.name,
        engine: (dto.engine || 'heygen') as any,
        engineAvatarId: dto.engineAvatarId || null,
        kind: (dto.kind || 'preset') as any,
        sourceImageKey: dto.sourceImageKey || null,
        previewUrl: null,
        defaultVoiceId: dto.defaultVoiceId || null,
        tags: dto.tags || [],
        meta: dto.meta || {},
        status: 'ready',
      },
    });
    return this.enrich(row);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpsertAvatarDto) {
    const row = await this.prisma.avatar.update({
      where: { id },
      data: {
        name: dto.name,
        engine: dto.engine as any,
        engineAvatarId: dto.engineAvatarId || null,
        kind: dto.kind as any,
        sourceImageKey: dto.sourceImageKey || null,
        previewUrl: null,
        defaultVoiceId: dto.defaultVoiceId || null,
        tags: dto.tags,
        meta: dto.meta,
      },
    });
    return this.enrich(row);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.avatar.delete({ where: { id } });
    return { ok: true };
  }
}
