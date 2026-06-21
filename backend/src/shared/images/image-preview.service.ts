import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { S3Service } from '../../integrations/storage/s3.service';

@Injectable()
export class ImagePreviewService {
  private readonly logger = new Logger(ImagePreviewService.name);

  constructor(private readonly s3: S3Service) {}

  previewKeyForAvatar(avatarId: string): string {
    return `factory/previews/avatars/${avatarId}.webp`;
  }

  /** Resize source photo to a small WebP card preview (~30–80 KB). */
  async createAvatarPreview(avatarId: string, sourceKey: string): Promise<string> {
    const previewKey = this.previewKeyForAvatar(avatarId);
    const src = await this.s3.getObject(sourceKey);
    const thumb = await sharp(src)
      .rotate()
      .resize(480, 640, { fit: 'cover', position: 'top' })
      .webp({ quality: 82 })
      .toBuffer();
    await this.s3.upload(previewKey, thumb, 'image/webp');
    this.logger.log(`Avatar preview ${avatarId}: ${(thumb.length / 1024).toFixed(0)} KB`);
    return previewKey;
  }
}
