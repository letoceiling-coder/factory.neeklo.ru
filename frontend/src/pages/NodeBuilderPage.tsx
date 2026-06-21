import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Workflow, Trash2, ArrowLeft, LayoutTemplate } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, Spinner, EmptyState, Field } from '@/components/ui/misc';
import { NodeBuilderCanvas } from '@/components/workflow/NodeBuilderCanvas';
import { useTranslation } from '@/i18n/useTranslation';

interface WF { id: string; name: string; description?: string; }

export function NodeBuilderPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const { data: workflows, isLoading } = useQuery({ queryKey: ['workflows'], queryFn: () => api.get<WF[]>('/workflows') });
  const createMut = useMutation({
    mutationFn: () => api.post<WF>('/workflows', { name }),
    onSuccess: (wf) => { qc.invalidateQueries({ queryKey: ['workflows'] }); setOpen(false); setName(''); setActive(wf.id); },
  });
  const createFullMut = useMutation({
    mutationFn: () => api.post<WF & { nodes?: unknown[] }>('/workflows/from-template', {
      name: 'Полный пайплайн',
      templateId: 'full',
      description: 'Все узлы: бриф → сценарий → озвучка → аватар → монтаж → MP4',
    }),
    onSuccess: (wf) => { qc.invalidateQueries({ queryKey: ['workflows'] }); setActive(wf.id); },
  });
  const delMut = useMutation({ mutationFn: (id: string) => api.del(`/workflows/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }) });

  if (active) {
    return (
      <div>
        <button onClick={() => setActive(null)} className="mb-3 flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </button>
        <NodeBuilderCanvas workflowId={active} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('nodeBuilder.title')}
        subtitle={t('nodeBuilder.subtitle')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => createFullMut.mutate()} disabled={createFullMut.isPending}>
              <LayoutTemplate className="h-4 w-4" /> {t('nodeBuilder.newFull')}
            </Button>
            <Button variant="gradient" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('nodeBuilder.new')}</Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !workflows || workflows.length === 0 ? (
        <EmptyState icon={<Workflow className="h-10 w-10" />} text={t('common.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Card key={wf.id} className="group cursor-pointer transition-all hover:card-glow" onClick={() => setActive(wf.id)}>
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div className="font-medium">{wf.name}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); delMut.mutate(wf.id); }} className="hidden text-[var(--muted-foreground)] hover:text-red-500 group-hover:block">
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={t('nodeBuilder.new')}>
        <div className="space-y-4">
          <Field label={t('common.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button variant="gradient" className="w-full" onClick={() => createMut.mutate()} disabled={!name}>{t('common.create')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
