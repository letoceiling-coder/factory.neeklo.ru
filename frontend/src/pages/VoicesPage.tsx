import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AudioLines, Trash2, Play, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, Spinner, EmptyState, Field } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface Voice {
  id: string;
  name: string;
  voiceId: string;
  language: string;
  previewUrl?: string;
  settings?: any;
}
interface CatalogVoice { voiceId: string; name: string; previewUrl?: string; }

export function VoicesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [form, setForm] = useState<any>({ name: '', voiceId: '', language: 'ru' });

  const { data: voices, isLoading } = useQuery({ queryKey: ['voices'], queryFn: () => api.get<Voice[]>('/voices') });
  const { data: catalog } = useQuery({
    queryKey: ['voiceCatalog'],
    queryFn: () => api.get<CatalogVoice[] | { error: string; voices: [] }>('/voices/catalog'),
    enabled: showCatalog,
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/voices', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voices'] });
      setOpen(false);
      setForm({ name: '', voiceId: '', language: 'ru' });
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/voices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voices'] }),
  });

  const catalogList = Array.isArray(catalog) ? catalog : [];

  return (
    <div>
      <PageHeader
        title={t('voices.title')}
        subtitle={t('voices.subtitle')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCatalog(true)}>
              <Download className="h-4 w-4" /> {t('voices.catalog')}
            </Button>
            <Button variant="gradient" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t('voices.new')}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !voices || voices.length === 0 ? (
        <EmptyState icon={<AudioLines className="h-10 w-10" />} text={t('common.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((v) => (
            <Card key={v.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                    <AudioLines className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{v.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{v.voiceId.slice(0, 12)}…</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{v.language.toUpperCase()}</Badge>
                  {v.previewUrl && (
                    <button onClick={() => new Audio(v.previewUrl).play()} className="text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => delMut.mutate(v.id)} className="text-[var(--muted-foreground)] hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={t('voices.new')}>
        <div className="space-y-4">
          <Field label={t('common.name')}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('voices.voiceId')}>
            <Input value={form.voiceId} onChange={(e) => setForm({ ...form, voiceId: e.target.value })} placeholder="ElevenLabs voice_id" />
          </Field>
          <Field label={t('common.language')}>
            <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </Select>
          </Field>
          <Button variant="gradient" className="w-full" onClick={() => createMut.mutate(form)} disabled={!form.name || !form.voiceId}>
            {t('common.create')}
          </Button>
        </div>
      </Dialog>

      <Dialog open={showCatalog} onClose={() => setShowCatalog(false)} title={t('voices.catalog')} className="max-w-xl">
        {!catalog ? (
          <Spinner />
        ) : catalogList.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t('common.empty')}</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {catalogList.map((c) => (
              <div key={c.voiceId} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <div className="text-sm font-medium">{c.name}</div>
                <Button size="sm" variant="outline" onClick={() => createMut.mutate({ name: c.name, voiceId: c.voiceId, previewUrl: c.previewUrl, language: 'ru' })}>
                  {t('voices.import')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
