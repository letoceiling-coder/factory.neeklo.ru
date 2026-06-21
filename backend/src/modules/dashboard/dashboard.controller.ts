import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Get()
  async stats() {
    const [avatars, voices, projects, ready, jobsActive, assets] = await Promise.all([
      this.prisma.avatar.count(),
      this.prisma.voiceProfile.count(),
      this.prisma.videoProject.count(),
      this.prisma.videoProject.count({ where: { status: 'ready' } }),
      this.prisma.renderJob.count({ where: { status: { in: ['queued', 'active'] } } }),
      this.prisma.asset.count(),
    ]);

    const recentProjects = await this.prisma.videoProject.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: { _count: { select: { scenes: true } } },
    });

    const recentJobs = await this.prisma.renderJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      counts: { avatars, voices, projects, ready, jobsActive, assets },
      recentProjects,
      recentJobs,
    };
  }
}
