import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { JobsModule } from './modules/jobs/jobs.module';

import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './modules/auth/guards';
import { UsersModule } from './modules/users/users.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { AvatarsModule } from './modules/avatars/avatars.module';
import { VoicesModule } from './modules/voices/voices.module';
import { VideosModule } from './modules/videos/videos.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AgentModule } from './modules/agent/agent.module';
import { AssetsModule } from './modules/assets/assets.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SharedModule,
    IntegrationsModule,
    PipelineModule,
    JobsModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    AvatarsModule,
    VoicesModule,
    VideosModule,
    WorkflowsModule,
    AgentModule,
    AssetsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
