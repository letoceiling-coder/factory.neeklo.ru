import { Global, Module } from '@nestjs/common';
import { QueuesService } from './queues.service';
import { JobsController } from './jobs.controller';

@Global()
@Module({
  controllers: [JobsController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class JobsModule {}
