import { Module } from '@nestjs/common';
import { AvatarsController } from './avatars.controller';
import { ImagePreviewService } from '../../shared/images/image-preview.service';

@Module({
  controllers: [AvatarsController],
  providers: [ImagePreviewService],
})
export class AvatarsModule {}
