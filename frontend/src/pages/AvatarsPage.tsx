import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserSquare2, Trash2, Upload, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, Spinner, EmptyState, Field } from '@/components/ui/misc';
import { AvatarCardPreview } from '@/components/avatars/AvatarCardPreview';
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

const emptyForm = { name: '', engine: 'heygen', kind: 'preset' as string };

export function AvatarsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: avatars, isLoading } = useQuery({
    queryKey: ['avatars'],
    queryFn: () => api.get<Avatar[]>('/avatars'),
    staleTime: 60_000,
  });
  const { data: voices } = useQuery({ queryKey: ['voices'], queryFn: () => api.get<Voice[]>('/voices') });

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setUploadError('');
    setUploading(false);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (a: Avatar) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      engine: a.engine,
      kind: a.kind,
      engineAvatarId: a.engineAvatarId || '',
      defaultVoiceId: a.defaultVoiceId || '',
      sourceImageKey: a.sourceImageKey || '',
      previewUrl: a.previewUrl || '',
    });
    setUploadError('');
    setOpen(true);
  };

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/avatars', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avatars'] });
      setOpen(false);
      resetForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.put(`/avatars/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avatars'] });
      setOpen(false);
      resetForm();
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/avatars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avatars'] }),
  });

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const asset = await api.upload<{ key: string; url: string }>('/assets/upload', fd);
      setForm((f: any) => ({
        ...f,
        sourceImageKey: asset.key,
        previewUrl: asset.url,
        kind: f.kind === 'preset' ? 'photo' : f.kind,
      }));
    } catch (e: any) {
      setUploadError(e.message || t('avatars.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const needsPhoto = form.kind === 'photo' || form.kind === 'cloned' || form.kind === 'custom';
  const canSave = form.name && !uploading && (!needsPhoto || form.sourceImageKey || form.engineAvatarId);

  const submit = () => {
    const body = {
      ...form,
      engineAvatarId: form.engineAvatarId || undefined,
      defaultVoiceId: form.defaultVoiceId || undefined,
      sourceImageKey: form.sourceImageKey || undefined,
    };
    if (editId) updateMut.mutate({ id: editId, body });
    else createMut.mutate(body);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <PageHeader
        title={t('avatars.title')}
        subtitle={t('avatars.subtitle')}
        action={
          <Button variant="gradient" onClick={openCreate}>
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
                {a.sourceImageKey || a.previewUrl ? (
                  <AvatarCardPreview src={a.previewUrl || `/api/avatars/${a.id}/preview`} alt={a.name} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserSquare2 className="h-12 w-12 text-[var(--muted-foreground)]" />
                  </div>
                )}
                <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                  <button
                    onClick={() => openEdit(a)}
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                    title={t('common.edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => delMut.mutate(a.id)}
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-red-600"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Badge variant="info" className="absolute left-2 top-2">{a.engine}</Badge>
              </div>
              <CardContent className="p-3">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{t(`avatars.kinds.${a.kind}`)}</div>
                {!a.sourceImageKey && !a.engineAvatarId && (
                  <div className="mt-1 text-xs text-amber-500">{t('avatars.incomplete')}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={editId ? t('avatars.edit') : t('avatars.create')}
      >
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
            <Input
              value={form.engineAvatarId || ''}
              onChange={(e) => setForm({ ...form, engineAvatarId: e.target.value })}
              placeholder="avatar_id / talking_photo_id"
            />
          </Field>
          <Field label={t('avatars.defaultVoice')}>
            <Select value={form.defaultVoiceId || ''} onChange={(e) => setForm({ ...form, defaultVoiceId: e.target.value })}>
              <option value="">{t('common.none')}</option>
              {voices?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label={t('avatars.sourceImage')}>
            <label className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {form.previewUrl ? t('avatars.replacePhoto') : t('avatars.uploadPhoto')}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            </label>
            {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
            {form.previewUrl && <img src={form.previewUrl} alt="" className="mt-2 h-32 w-full rounded-lg object-cover" />}
            {form.sourceImageKey && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t('avatars.photoAttached')}</p>
            )}
          </Field>
          <Button variant="gradient" className="w-full" onClick={submit} disabled={!canSave || isPending}>
            {isPending ? <Spinner className="h-4 w-4" /> : (editId ? t('common.save') : t('avatars.create'))}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
