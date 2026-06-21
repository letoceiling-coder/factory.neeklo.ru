import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';

function kindOf(mime: string): 'audio' | 'video' | 'image' | 'other' {
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return 'other';
}

@Controller('assets')
export class AssetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Get()
  async list(@Query('kind') kind?: string) {
    const assets = await this.prisma.asset.findMany({
      where: kind ? { kind: kind as any } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return Promise.all(
      assets.map(async (a) => ({ ...a, url: await this.s3.getPresignedUrl(a.key, 3600).catch(() => null) })),
    );
  }

  @Get(':id/url')
  async url(@Param('id') id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) return { url: null };
    return { url: await this.s3.getPresignedUrl(asset.key, 3600) };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: any) {
    const kind = kindOf(file.mimetype);
    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const key = `uploads/${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await this.s3.upload(key, file.buffer, file.mimetype);
    const asset = await this.prisma.asset.create({
      data: { kind, key, name: file.originalname, size: file.size },
    });
    const uploadUrl = await this.s3.getPresignedUrl(key, 3600).catch(() => null);
    return { ...asset, url: uploadUrl };
  }
}
