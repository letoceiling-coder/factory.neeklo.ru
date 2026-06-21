import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('projectId') projectId?: string, @Query('status') status?: string) {
    return this.prisma.renderJob.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('stats')
  async stats() {
    const [queued, active, completed, failed] = await Promise.all([
      this.prisma.renderJob.count({ where: { status: 'queued' } }),
      this.prisma.renderJob.count({ where: { status: 'active' } }),
      this.prisma.renderJob.count({ where: { status: 'completed' } }),
      this.prisma.renderJob.count({ where: { status: 'failed' } }),
    ]);
    return { queued, active, completed, failed };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.renderJob.findUnique({ where: { id } });
  }
}
