import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Play, Plus, Trash2, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Spinner, Field } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface Scene { id: string; order: number; text: string; avatarId?: string; voiceId?: string; status: string; }
interface Project {
  id: string; title: string; brief?: string; script?: string; status: string; aspectRatio: string; language: string;
  finalVideoUrl?: string; scenes: Scene[];
}
interface Avatar { id: string; name: string; defaultVoiceId?: string; }
interface Voice { id: string; name: string; }

const sceneStatusVariant: Record<string, any> = {
  pending: 'muted', tts_done: 'info', rendering: 'warning', rendered: 'success', failed: 'danger',
};

export function VideoDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [genOpts, setGenOpts] = useState({ targetScenes: 6, tone: 'информативный', avatarId: '', voiceId: '' });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/videos/${id}`),
    refetchInterval: 4000,
  });
  const { data: avatars } = useQuery({ queryKey: ['avatars'], queryFn: () => api.get<Avatar[]>('/avatars') });
  const { data: voices } = useQuery({ queryKey: ['voices'], queryFn: () => api.get<Voice[]>('/voices') });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', id] });

  const scriptMut = useMutation({ mutationFn: () => api.post(`/videos/${id}/script`, genOpts), onSuccess: invalidate });
  const generateMut = useMutation({ mutationFn: () => api.post(`/videos/${id}/generate`), onSuccess: invalidate });
  const updateSceneMut = useMutation({ mutationFn: (s: { sceneId: string; data: any }) => api.put(`/videos/scenes/${s.sceneId}`, s.data), onSuccess: invalidate });
  const addSceneMut = useMutation({ mutationFn: () => api.post(`/videos/${id}/scenes`, { text: 'Новая сцена' }), onSuccess: invalidate });
  const delSceneMut = useMutation({ mutationFn: (sceneId: string) => api.del(`/videos/scenes/${sceneId}`), onSuccess: invalidate });

  if (isLoading || !project)
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <button onClick={() => navigate('/videos')} className="mb-4 flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>

      <PageHeader
        title={project.title}
        subtitle={project.brief}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={project.status === 'ready' ? 'success' : 'warning'}>{t(`videos.statuses.${project.status}`)}</Badge>
            <Button variant="gradient" onClick={() => generateMut.mutate()} disabled={generateMut.isPending || project.scenes.length === 0}>
              <Play className="h-4 w-4" /> {t('videos.startGeneration')}
            </Button>
          </div>
        }
      />

      {project.finalVideoUrl && (
        <Card className="mb-6 card-glow">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">{t('videos.finalVideo')}</h3>
              <a href={project.finalVideoUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline"><Download className="h-4 w-4" /> {t('videos.download')}</Button>
              </a>
            </div>
            <video src={project.finalVideoUrl} controls className="w-full rounded-[var(--radius-md)]" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-[var(--primary)]" /> {t('videos.generateScript')}</h3>
            <Field label={t('videos.targetScenes')}>
              <Input type="number" value={genOpts.targetScenes} onChange={(e) => setGenOpts({ ...genOpts, targetScenes: +e.target.value })} />
            </Field>
            <Field label={t('videos.tone')}>
              <Input value={genOpts.tone} onChange={(e) => setGenOpts({ ...genOpts, tone: e.target.value })} />
            </Field>
            <Field label={t('videos.assignAvatar')}>
              <Select value={genOpts.avatarId} onChange={(e) => setGenOpts({ ...genOpts, avatarId: e.target.value })}>
                <option value="">{t('common.none')}</option>
                {avatars?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label={t('videos.assignVoice')}>
              <Select value={genOpts.voiceId} onChange={(e) => setGenOpts({ ...genOpts, voiceId: e.target.value })}>
                <option value="">{t('common.none')}</option>
                {voices?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Button className="w-full" variant="outline" onClick={() => scriptMut.mutate()} disabled={scriptMut.isPending}>
              {scriptMut.isPending ? <Spinner /> : <><Sparkles className="h-4 w-4" /> {t('videos.generateScript')}</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t('videos.scenes')} ({project.scenes.length})</h3>
              <Button size="sm" variant="ghost" onClick={() => addSceneMut.mutate()}><Plus className="h-4 w-4" /> {t('videos.addScene')}</Button>
            </div>
            <div className="space-y-3">
              {project.scenes.map((s) => (
                <div key={s.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">{t('videos.scene')} {s.order + 1}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={sceneStatusVariant[s.status]}>{s.status}</Badge>
                      <button onClick={() => delSceneMut.mutate(s.id)} className="text-[var(--muted-foreground)] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <Textarea
                    defaultValue={s.text}
                    rows={2}
                    onBlur={(e) => e.target.value !== s.text && updateSceneMut.mutate({ sceneId: s.id, data: { text: e.target.value } })}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Select value={s.avatarId || ''} onChange={(e) => updateSceneMut.mutate({ sceneId: s.id, data: { avatarId: e.target.value || null } })}>
                      <option value="">{t('videos.assignAvatar')}…</option>
                      {avatars?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                    <Select value={s.voiceId || ''} onChange={(e) => updateSceneMut.mutate({ sceneId: s.id, data: { voiceId: e.target.value || null } })}>
                      <option value="">{t('videos.assignVoice')}…</option>
                      {voices?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </Select>
                  </div>
                </div>
              ))}
              {project.scenes.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">{t('common.empty')}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
