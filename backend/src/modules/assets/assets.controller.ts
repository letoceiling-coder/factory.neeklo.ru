import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(AssetsController.name);

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
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    const kind = kindOf(file.mimetype);
    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const key = `factory/uploads/${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      await this.s3.upload(key, file.buffer, file.mimetype);
    } catch (err: any) {
      this.logger.error(`S3 upload failed for ${key}: ${err?.message || err}`);
      throw new InternalServerErrorException(
        'Storage upload failed. Check Selectel S3 credentials and bucket permissions.',
      );
    }
    const asset = await this.prisma.asset.create({
      data: { kind, key, name: file.originalname, size: file.size },
    });
    const uploadUrl = await this.s3.getPresignedUrl(key, 3600).catch(() => null);
    return { ...asset, url: uploadUrl };
  }
}
