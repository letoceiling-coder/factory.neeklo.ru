import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';
import { ImagePreviewService } from '../../shared/images/image-preview.service';
import { Public } from '../auth/decorators';

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
    private readonly previews: ImagePreviewService,
  ) {}

  private cardPreviewUrl(id: string): string {
    return `/api/avatars/${id}/preview`;
  }

  private withCardPreview<T extends { id: string }>(avatar: T) {
    return { ...avatar, previewUrl: this.cardPreviewUrl(avatar.id) };
  }

  private async ensurePreviewKey(avatarId: string, sourceImageKey: string, meta: Record<string, any> = {}) {
    if (meta.previewKey) return meta.previewKey as string;
    const previewKey = await this.previews.createAvatarPreview(avatarId, sourceImageKey);
    await this.prisma.avatar.update({
      where: { id: avatarId },
      data: { meta: { ...meta, previewKey } },
    });
    return previewKey;
  }

  private queuePreviewGeneration(avatarId: string, sourceImageKey: string, meta: Record<string, any> = {}) {
    if (meta.previewKey) return;
    void this.ensurePreviewKey(avatarId, sourceImageKey, meta).catch(() => undefined);
  }

  @Get()
  async list() {
    const rows = await this.prisma.avatar.findMany({ orderBy: { createdAt: 'desc' } });
    for (const row of rows) {
      if (row.sourceImageKey) {
        this.queuePreviewGeneration(row.id, row.sourceImageKey, (row.meta as Record<string, any>) || {});
      }
    }
    return rows.map((r) => this.withCardPreview(r));
  }

  /** Small cached WebP preview for avatar cards (public — img tags cannot send JWT). */
  @Public()
  @Get(':id/preview')
  async preview(@Param('id') id: string, @Res() res: Response) {
    const avatar = await this.prisma.avatar.findUnique({ where: { id } });
    if (!avatar?.sourceImageKey) throw new NotFoundException('Preview not available');

    const meta = ((avatar.meta as Record<string, any>) || {});
    let previewKey = meta.previewKey as string | undefined;
    if (!previewKey) {
      previewKey = await this.ensurePreviewKey(id, avatar.sourceImageKey, meta);
    }

    const buf = await this.s3.getObject(previewKey);
    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=604800, immutable',
    });
    res.send(buf);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const row = await this.prisma.avatar.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    return this.withCardPreview(row);
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
    if (row.sourceImageKey) {
      await this.ensurePreviewKey(row.id, row.sourceImageKey, (row.meta as Record<string, any>) || {});
    }
    return this.withCardPreview(
      await this.prisma.avatar.findUniqueOrThrow({ where: { id: row.id } }),
    );
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpsertAvatarDto) {
    const prev = await this.prisma.avatar.findUnique({ where: { id } });
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
    const sourceChanged = dto.sourceImageKey && dto.sourceImageKey !== prev?.sourceImageKey;
    if (sourceChanged && row.sourceImageKey) {
      const oldKey = (prev?.meta as Record<string, any>)?.previewKey;
      if (oldKey) await this.s3.delete(oldKey).catch(() => undefined);
      const meta = { ...((prev?.meta as Record<string, any>) || {}), ...(dto.meta || {}) };
      delete meta.previewKey;
      await this.ensurePreviewKey(row.id, row.sourceImageKey, meta);
    }
    return this.withCardPreview(
      await this.prisma.avatar.findUniqueOrThrow({ where: { id: row.id } }),
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const avatar = await this.prisma.avatar.findUnique({ where: { id } });
    const previewKey = (avatar?.meta as Record<string, any>)?.previewKey;
    if (previewKey) await this.s3.delete(previewKey).catch(() => undefined);
    await this.prisma.avatar.delete({ where: { id } });
    return { ok: true };
  }
}
