import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.avatar.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.avatar.findUnique({ where: { id } });
  }

  @Post()
  create(@Body() dto: UpsertAvatarDto) {
    return this.prisma.avatar.create({
      data: {
        name: dto.name,
        engine: (dto.engine || 'heygen') as any,
        engineAvatarId: dto.engineAvatarId,
        kind: (dto.kind || 'preset') as any,
        sourceImageKey: dto.sourceImageKey,
        previewUrl: dto.previewUrl,
        defaultVoiceId: dto.defaultVoiceId,
        tags: dto.tags || [],
        meta: dto.meta || {},
        status: 'ready',
      },
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpsertAvatarDto) {
    return this.prisma.avatar.update({
      where: { id },
      data: {
        name: dto.name,
        engine: dto.engine as any,
        engineAvatarId: dto.engineAvatarId,
        kind: dto.kind as any,
        sourceImageKey: dto.sourceImageKey,
        previewUrl: dto.previewUrl,
        defaultVoiceId: dto.defaultVoiceId,
        tags: dto.tags,
        meta: dto.meta,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.avatar.delete({ where: { id } });
    return { ok: true };
  }
}
