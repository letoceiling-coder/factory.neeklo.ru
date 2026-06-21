import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clapperboard, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, Spinner, EmptyState, Field } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface Project {
  id: string;
  title: string;
  brief?: string;
  status: string;
  aspectRatio: string;
  _count?: { scenes: number };
}

const statusVariant: Record<string, any> = {
  ready: 'success', generating: 'warning', assembling: 'warning', scripting: 'info', failed: 'danger', draft: 'muted',
};

export function VideosPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', brief: '', language: 'ru', aspectRatio: '16:9' });

  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => api.get<Project[]>('/videos'), refetchInterval: 5000 });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post<Project>('/videos', body),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      navigate(`/videos/${p.id}`);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/videos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <div>
      <PageHeader
        title={t('videos.title')}
        subtitle={t('videos.subtitle')}
        action={<Button variant="gradient" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('videos.new')}</Button>}
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState icon={<Clapperboard className="h-10 w-10" />} text={t('common.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="group cursor-pointer transition-all hover:card-glow" onClick={() => navigate(`/videos/${p.id}`)}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); delMut.mutate(p.id); }} className="hidden text-[var(--muted-foreground)] hover:text-red-500 group-hover:block">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="font-semibold">{p.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">{p.brief || '—'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={statusVariant[p.status] || 'muted'}>{t(`videos.statuses.${p.status}`)}</Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">{p.aspectRatio} · {p._count?.scenes ?? 0} {t('videos.scenes').toLowerCase()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={t('videos.new')}>
        <div className="space-y-4">
          <Field label={t('common.name')}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t('videos.brief')}>
            <Textarea value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} rows={4} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('common.language')}>
              <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="ru">RU</option>
                <option value="en">EN</option>
              </Select>
            </Field>
            <Field label={t('videos.aspectRatio')}>
              <Select value={form.aspectRatio} onChange={(e) => setForm({ ...form, aspectRatio: e.target.value })}>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </Select>
            </Field>
          </div>
          <Button variant="gradient" className="w-full" onClick={() => createMut.mutate(form)} disabled={!form.title || createMut.isPending}>
            {t('common.create')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
