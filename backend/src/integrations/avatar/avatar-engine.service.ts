import { Injectable } from '@nestjs/common';
import { ProviderCredentialsService } from '../provider-credentials.service';
import { AvatarEngine, AvatarEngineSlug } from './avatar-engine.interface';
import { HeyGenEngine } from './heygen.engine';
import { HedraEngine } from './hedra.engine';
import { DidEngine } from './did.engine';

@Injectable()
export class AvatarEngineService {
  private readonly engines: Record<AvatarEngineSlug, AvatarEngine>;

  constructor(creds: ProviderCredentialsService) {
    this.engines = {
      heygen: new HeyGenEngine(creds),
      hedra: new HedraEngine(creds),
      did: new DidEngine(creds),
    };
  }

  get(slug: AvatarEngineSlug): AvatarEngine {
    const engine = this.engines[slug];
    if (!engine) throw new Error(`Unknown avatar engine: ${slug}`);
    return engine;
  }
}
