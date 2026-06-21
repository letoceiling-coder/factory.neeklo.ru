import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { ElevenLabsService } from '../../integrations/tts/elevenlabs.service';

class UpsertVoiceDto {
  @IsString() name!: string;
  @IsString() voiceId!: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() previewUrl?: string;
  @IsOptional() @IsObject() settings?: Record<string, any>;
}

@Controller('voices')
export class VoicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elevenlabs: ElevenLabsService,
  ) {}

  /** Voices saved as profiles in our DB. */
  @Get()
  list() {
    return this.prisma.voiceProfile.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Live catalog from ElevenLabs. */
  @Get('catalog')
  async catalog() {
    try {
      return await this.elevenlabs.listVoices();
    } catch (e: any) {
      return { error: e.message, voices: [] };
    }
  }

  @Post()
  create(@Body() dto: UpsertVoiceDto) {
    return this.prisma.voiceProfile.create({
      data: {
        name: dto.name,
        voiceId: dto.voiceId,
        language: dto.language || 'ru',
        previewUrl: dto.previewUrl,
        settings: dto.settings || {},
      },
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpsertVoiceDto) {
    return this.prisma.voiceProfile.update({
      where: { id },
      data: {
        name: dto.name,
        voiceId: dto.voiceId,
        language: dto.language,
        previewUrl: dto.previewUrl,
        settings: dto.settings,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.voiceProfile.delete({ where: { id } });
    return { ok: true };
  }
}
