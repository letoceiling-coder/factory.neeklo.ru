import { useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Spinner, EmptyState } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface Job { id: string; type: string; status: string; progress: number; projectId?: string; error?: string; createdAt: string; }
interface Stats { queued: number; active: number; completed: number; failed: number; }

const variant: Record<string, any> = { queued: 'muted', active: 'warning', completed: 'success', failed: 'danger' };

export function JobsPage() {
  const { t } = useTranslation();
  const { data: jobs, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => api.get<Job[]>('/jobs'), refetchInterval: 3000 });
  const { data: stats } = useQuery({ queryKey: ['jobStats'], queryFn: () => api.get<Stats>('/jobs/stats'), refetchInterval: 3000 });

  return (
    <div>
      <PageHeader title={t('jobs.title')} subtitle={t('jobs.subtitle')} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(['queued', 'active', 'completed', 'failed'] as const).map((k) => (
          <Card key={k}><CardContent className="p-5">
            <div className="text-2xl font-bold">{stats?.[k] ?? 0}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{t(`jobs.${k}`)}</div>
          </CardContent></Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-10 w-10" />} text={t('common.empty')} />
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="p-4">{t('jobs.type')}</th>
                <th className="p-4">{t('common.status')}</th>
                <th className="p-4">{t('jobs.progress')}</th>
                <th className="p-4">ID</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-4 font-medium">{t(`jobs.types.${j.type}`)}</td>
                  <td className="p-4"><Badge variant={variant[j.status]}>{j.status}</Badge></td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--muted)]">
                        <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" style={{ width: `${j.progress}%` }} />
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">{j.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-[var(--muted-foreground)]">{j.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
