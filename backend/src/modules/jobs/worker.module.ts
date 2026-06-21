import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { JobsModule } from './jobs.module';
import { WorkersService } from './workers.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SharedModule,
    IntegrationsModule,
    PipelineModule,
    JobsModule,
  ],
  providers: [WorkersService],
})
export class WorkerModule {}
