import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Play, Plus, Trash2, Download, Loader2, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Spinner, Field } from '@/components/ui/misc';
import { GenerationProgress } from '@/components/videos/GenerationProgress';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface Scene { id: string; order: number; text: string; avatarId?: string; voiceId?: string; status: string; }
interface Project {
  id: string; title: string; brief?: string; script?: string; status: string; aspectRatio: string; language: string;
  finalVideoUrl?: string; scenes: Scene[];
}
interface Avatar { id: string; name: string; defaultVoiceId?: string; }
interface Voice { id: string; name: string; }

const ACTIVE_PROJECT_STATUSES = ['generating', 'assembling', 'failed'] as const;

function isGenerationActive(project: Project): boolean {
  if (ACTIVE_PROJECT_STATUSES.includes(project.status as typeof ACTIVE_PROJECT_STATUSES[number])) return true;
  return project.scenes.some((s) => ['tts_done', 'rendering'].includes(s.status));
}

const sceneStatusVariant: Record<string, 'muted' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'muted', tts_done: 'info', rendering: 'warning', rendered: 'success', failed: 'danger',
};

const sceneCardClass: Record<string, string> = {
  pending: 'border-[var(--border)]',
  tts_done: 'border-blue-500/40 bg-blue-500/5',
  rendering: 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20',
  rendered: 'border-emerald-500/30 bg-emerald-500/5',
  failed: 'border-red-500/40 bg-red-500/5',
};

export function VideoDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const progressRef = useRef<HTMLDivElement>(null);
  const [genOpts, setGenOpts] = useState({ brief: '', targetScenes: 6, tone: 'информативный', avatarId: '', voiceId: '' });
  const [genError, setGenError] = useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/videos/${id}`),
    refetchInterval: (query) => {
      const p = query.state.data;
      if (!p) return 5000;
      if (isGenerationActive(p) || p.status === 'generating' || p.status === 'assembling') return 2000;
      return false;
    },
  });

  useEffect(() => {
    if (project) {
      setGenOpts((prev) => ({
        ...prev,
        brief: project.brief || prev.brief || '',
        avatarId: prev.avatarId || '',
        voiceId: prev.voiceId || '',
      }));
    }
  }, [project?.id, project?.brief]);

  const { data: avatars } = useQuery({ queryKey: ['avatars'], queryFn: () => api.get<Avatar[]>('/avatars') });
  const { data: voices } = useQuery({ queryKey: ['voices'], queryFn: () => api.get<Voice[]>('/voices') });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', id] });

  const scriptMut = useMutation({ mutationFn: () => api.post(`/videos/${id}/script`, genOpts), onSuccess: invalidate });
  const generateMut = useMutation({
    mutationFn: () => api.post(`/videos/${id}/generate`),
    onSuccess: () => {
      setGenError(null);
      invalidate();
      requestAnimationFrame(() => progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    },
    onError: (err) => setGenError(err instanceof ApiError ? err.message : String(err)),
  });
  const updateSceneMut = useMutation({ mutationFn: (s: { sceneId: string; data: any }) => api.put(`/videos/scenes/${s.sceneId}`, s.data), onSuccess: invalidate });
  const addSceneMut = useMutation({ mutationFn: () => api.post(`/videos/${id}/scenes`, { text: 'Новая сцена' }), onSuccess: invalidate });
  const delSceneMut = useMutation({ mutationFn: (sceneId: string) => api.del(`/videos/scenes/${sceneId}`), onSuccess: invalidate });

  if (isLoading || !project)
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>;

  const isGenerating = project.status === 'generating' || project.status === 'assembling';
  const isFailed = project.status === 'failed' || project.scenes.some((s) => s.status === 'failed');
  const showProgress = isGenerationActive(project) || generateMut.isPending;

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
            <Badge variant={project.status === 'ready' ? 'success' : project.status === 'failed' ? 'danger' : 'warning'}>
              {t(`videos.statuses.${project.status}`)}
            </Badge>
            <Button
              variant="gradient"
              onClick={() => generateMut.mutate()}
              disabled={(showProgress && !isFailed) || project.scenes.length === 0}
            >
              {showProgress && !isFailed ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t('videos.generation.inProgress')}</>
              ) : isFailed ? (
                <><Play className="h-4 w-4" /> {t('videos.generation.retry')}</>
              ) : (
                <><Play className="h-4 w-4" /> {t('videos.startGeneration')}</>
              )}
            </Button>
          </div>
        }
      />

      {genError && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {genError}
        </div>
      )}

      {showProgress && (
        <div ref={progressRef} className="mb-6">
          <GenerationProgress scenes={project.scenes} projectStatus={project.status} failed={isFailed} />
        </div>
      )}

      {isFailed && !showProgress && (
        <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('videos.generation.failedHint')}
        </div>
      )}

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
            <Field label={t('videos.brief')} hint={t('videos.briefHint')}>
              <Textarea
                value={genOpts.brief}
                onChange={(e) => setGenOpts({ ...genOpts, brief: e.target.value })}
                rows={6}
                placeholder={t('videos.briefPlaceholder')}
                disabled={isGenerating}
              />
            </Field>
            <Field label={t('videos.targetScenes')}>
              <Input type="number" value={genOpts.targetScenes} onChange={(e) => setGenOpts({ ...genOpts, targetScenes: +e.target.value })} disabled={isGenerating} />
            </Field>
            <Field label={t('videos.tone')}>
              <Input value={genOpts.tone} onChange={(e) => setGenOpts({ ...genOpts, tone: e.target.value })} disabled={isGenerating} />
            </Field>
            <Field label={t('videos.assignAvatar')}>
              <Select value={genOpts.avatarId} onChange={(e) => setGenOpts({ ...genOpts, avatarId: e.target.value })} disabled={isGenerating}>
                <option value="">{t('common.none')}</option>
                {avatars?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label={t('videos.assignVoice')}>
              <Select value={genOpts.voiceId} onChange={(e) => setGenOpts({ ...genOpts, voiceId: e.target.value })} disabled={isGenerating}>
                <option value="">{t('common.none')}</option>
                {voices?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Button className="w-full" variant="outline" onClick={() => scriptMut.mutate()} disabled={scriptMut.isPending || !genOpts.brief.trim() || isGenerating}>
              {scriptMut.isPending ? <Spinner /> : <><Sparkles className="h-4 w-4" /> {t('videos.generateScript')}</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t('videos.scenes')} ({project.scenes.length})</h3>
              <Button size="sm" variant="ghost" onClick={() => addSceneMut.mutate()} disabled={isGenerating}>
                <Plus className="h-4 w-4" /> {t('videos.addScene')}
              </Button>
            </div>

            {showProgress && (
              <div className="mb-4">
                <GenerationProgress scenes={project.scenes} projectStatus={project.status} compact />
              </div>
            )}

            <div className="space-y-3">
              {project.scenes.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'rounded-[var(--radius-md)] border p-3 transition-colors',
                    showProgress ? sceneCardClass[s.status] || sceneCardClass.pending : 'border-[var(--border)]',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">{t('videos.scene')} {s.order + 1}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={sceneStatusVariant[s.status] || 'muted'}>
                        {s.status === 'rendering' && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                        {t(`videos.sceneStatuses.${s.status}`)}
                      </Badge>
                      {!isGenerating && (
                        <button onClick={() => delSceneMut.mutate(s.id)} className="text-[var(--muted-foreground)] hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    defaultValue={s.text}
                    rows={2}
                    disabled={isGenerating}
                    onBlur={(e) => e.target.value !== s.text && updateSceneMut.mutate({ sceneId: s.id, data: { text: e.target.value } })}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Select
                      value={s.avatarId || ''}
                      disabled={isGenerating}
                      onChange={(e) => updateSceneMut.mutate({ sceneId: s.id, data: { avatarId: e.target.value || null } })}
                    >
                      <option value="">{t('videos.assignAvatar')}…</option>
                      {avatars?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                    <Select
                      value={s.voiceId || ''}
                      disabled={isGenerating}
                      onChange={(e) => updateSceneMut.mutate({ sceneId: s.id, data: { voiceId: e.target.value || null } })}
                    >
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
