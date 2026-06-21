import { Global, Module } from '@nestjs/common';
import { ProviderCredentialsService } from './provider-credentials.service';
import { OpenRouterService } from './llm/openrouter.service';
import { ElevenLabsService } from './tts/elevenlabs.service';
import { S3Service } from './storage/s3.service';
import { AvatarEngineService } from './avatar/avatar-engine.service';

@Global()
@Module({
  providers: [
    ProviderCredentialsService,
    OpenRouterService,
    ElevenLabsService,
    S3Service,
    AvatarEngineService,
  ],
  exports: [
    ProviderCredentialsService,
    OpenRouterService,
    ElevenLabsService,
    S3Service,
    AvatarEngineService,
  ],
})
export class IntegrationsModule {}
