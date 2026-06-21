import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserSquare2, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, Spinner, EmptyState, Field } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface Avatar {
  id: string;
  name: string;
  engine: string;
  kind: string;
  previewUrl?: string;
  sourceImageKey?: string;
  engineAvatarId?: string;
  defaultVoiceId?: string;
  tags: string[];
}
interface Voice { id: string; name: string; voiceId: string; }

export function AvatarsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', engine: 'heygen', kind: 'preset' });

  const { data: avatars, isLoading } = useQuery({ queryKey: ['avatars'], queryFn: () => api.get<Avatar[]>('/avatars') });
  const { data: voices } = useQuery({ queryKey: ['voices'], queryFn: () => api.get<Voice[]>('/voices') });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/avatars', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avatars'] });
      setOpen(false);
      setForm({ name: '', engine: 'heygen', kind: 'preset' });
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/avatars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avatars'] }),
  });

  const uploadPhoto = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const asset = await api.upload<{ key: string; url: string }>('/assets/upload', fd);
    setForm((f: any) => ({ ...f, sourceImageKey: asset.key, previewUrl: asset.url, kind: 'photo' }));
  };

  return (
    <div>
      <PageHeader
        title={t('avatars.title')}
        subtitle={t('avatars.subtitle')}
        action={
          <Button variant="gradient" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('avatars.new')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !avatars || avatars.length === 0 ? (
        <EmptyState icon={<UserSquare2 className="h-10 w-10" />} text={t('common.empty')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {avatars.map((a) => (
            <Card key={a.id} className="group overflow-hidden">
              <div className="relative aspect-[3/4] bg-[var(--muted)]">
                {a.previewUrl ? (
                  <img src={a.previewUrl} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserSquare2 className="h-12 w-12 text-[var(--muted-foreground)]" />
                  </div>
                )}
                <button
                  onClick={() => delMut.mutate(a.id)}
                  className="absolute right-2 top-2 hidden rounded-full bg-black/60 p-1.5 text-white group-hover:block"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Badge variant="info" className="absolute left-2 top-2">{a.engine}</Badge>
              </div>
              <CardContent className="p-3">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{t(`avatars.kinds.${a.kind}`)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={t('avatars.create')}>
        <div className="space-y-4">
          <Field label={t('common.name')}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('avatars.engine')}>
              <Select value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })}>
                <option value="heygen">HeyGen</option>
                <option value="hedra">Hedra</option>
                <option value="did">D-ID</option>
              </Select>
            </Field>
            <Field label={t('avatars.kind')}>
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="preset">{t('avatars.kinds.preset')}</option>
                <option value="photo">{t('avatars.kinds.photo')}</option>
                <option value="cloned">{t('avatars.kinds.cloned')}</option>
                <option value="custom">{t('avatars.kinds.custom')}</option>
              </Select>
            </Field>
          </div>
          <Field label="Engine Avatar ID">
            <Input value={form.engineAvatarId || ''} onChange={(e) => setForm({ ...form, engineAvatarId: e.target.value })} placeholder="avatar_id / talking_photo_id" />
          </Field>
          <Field label={t('avatars.defaultVoice')}>
            <Select value={form.defaultVoiceId || ''} onChange={(e) => setForm({ ...form, defaultVoiceId: e.target.value })}>
              <option value="">{t('common.none')}</option>
              {voices?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label={t('avatars.sourceImage')}>
            <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
              <Upload className="h-4 w-4" />
              {form.previewUrl ? t('common.edit') : t('avatars.uploadPhoto')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            </label>
            {form.previewUrl && <img src={form.previewUrl} className="mt-2 h-24 rounded-lg object-cover" />}
          </Field>
          <Button variant="gradient" className="w-full" onClick={() => createMut.mutate(form)} disabled={!form.name || createMut.isPending}>
            {t('avatars.create')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
