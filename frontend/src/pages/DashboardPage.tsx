import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  UserSquare2,
  AudioLines,
  Clapperboard,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Bot,
  Workflow,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface DashboardData {
  counts: { avatars: number; voices: number; projects: number; ready: number; jobsActive: number; assets: number };
  recentProjects: { id: string; title: string; status: string; _count: { scenes: number } }[];
  recentJobs: { id: string; type: string; status: string; progress: number }[];
}

const statusVariant: Record<string, any> = {
  ready: 'success',
  generating: 'warning',
  assembling: 'warning',
  scripting: 'info',
  failed: 'danger',
  draft: 'muted',
  completed: 'success',
  active: 'warning',
  queued: 'muted',
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardData>('/dashboard'), refetchInterval: 5000 });

  if (isLoading || !data)
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const stats = [
    { key: 'projects', value: data.counts.projects, icon: Clapperboard, color: 'from-violet-500 to-fuchsia-500' },
    { key: 'ready', value: data.counts.ready, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { key: 'avatars', value: data.counts.avatars, icon: UserSquare2, color: 'from-amber-500 to-orange-500' },
    { key: 'voices', value: data.counts.voices, icon: AudioLines, color: 'from-cyan-500 to-blue-500' },
    { key: 'jobsActive', value: data.counts.jobsActive, icon: Loader2, color: 'from-pink-500 to-rose-500' },
    { key: 'assets', value: data.counts.assets, icon: FolderOpen, color: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <div>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.key} className="overflow-hidden">
            <CardContent className="p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{t(`dashboard.${s.key}`)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t('dashboard.recentProjects')}</h3>
              <Link to="/videos" className="text-xs text-[var(--primary)]">{t('common.all')}</Link>
            </div>
            <div className="space-y-2">
              {data.recentProjects.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">{t('common.empty')}</p>}
              {data.recentProjects.map((p) => (
                <Link
                  key={p.id}
                  to={`/videos/${p.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--muted)]"
                >
                  <div className="flex items-center gap-3">
                    <Clapperboard className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{p._count.scenes} {t('videos.scenes').toLowerCase()}</div>
                    </div>
                  </div>
                  <Badge variant={statusVariant[p.status] || 'muted'}>{t(`videos.statuses.${p.status}`)}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="aurora-bg overflow-hidden">
            <CardContent className="relative z-10 p-5">
              <h3 className="font-semibold">{t('dashboard.quickStart')}</h3>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t('dashboard.quickStartDesc')}</p>
              <div className="mt-4 space-y-2">
                <Link to="/agent" className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--card)] p-3 text-sm font-medium hover:opacity-90">
                  <span className="flex items-center gap-2"><Bot className="h-4 w-4 text-[var(--primary)]" /> {t('nav.agent')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/builder" className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--card)] p-3 text-sm font-medium hover:opacity-90">
                  <span className="flex items-center gap-2"><Workflow className="h-4 w-4 text-[var(--accent)]" /> {t('nav.nodeBuilder')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 font-semibold">{t('dashboard.recentJobs')}</h3>
              <div className="space-y-2">
                {data.recentJobs.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">{t('common.empty')}</p>}
                {data.recentJobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">{t(`jobs.types.${j.type}`)}</span>
                    <Badge variant={statusVariant[j.status] || 'muted'}>{j.status} {j.progress ? `${j.progress}%` : ''}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
