import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { FfmpegService } from './ffmpeg.service';

@Module({
  providers: [PipelineService, FfmpegService],
  exports: [PipelineService, FfmpegService],
})
export class PipelineModule {}
