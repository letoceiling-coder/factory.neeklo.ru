import { type ReactNode } from 'react';
import { Check, Loader2, Mic, Film, Layers, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

export interface SceneProgress {
  id: string;
  order: number;
  status: string;
}

interface Stats {
  total: number;
  pending: number;
  ttsDone: number;
  rendering: number;
  rendered: number;
  failed: number;
  phase: 'tts' | 'avatar' | 'assemble';
  percent: number;
}

export function computeGenerationStats(scenes: SceneProgress[], projectStatus: string): Stats {
  const total = scenes.length;
  const pending = scenes.filter((s) => s.status === 'pending').length;
  const ttsDone = scenes.filter((s) => s.status === 'tts_done').length;
  const rendering = scenes.filter((s) => s.status === 'rendering').length;
  const rendered = scenes.filter((s) => s.status === 'rendered').length;
  const failed = scenes.filter((s) => s.status === 'failed').length;

  let phase: Stats['phase'] = 'tts';
  if (projectStatus === 'assembling' || (rendered === total && total > 0)) {
    phase = 'assemble';
  } else if (pending === 0) {
    phase = 'avatar';
  }

  const stepWeight = (s: SceneProgress) => {
    if (s.status === 'rendered') return 2;
    if (s.status === 'rendering' || s.status === 'tts_done') return 1;
    return 0;
  };
  const stepsDone = scenes.reduce((n, s) => n + stepWeight(s), 0);
  const totalSteps = Math.max(total * 2 + 1, 1);

  let percent: number;
  if (projectStatus === 'ready') percent = 100;
  else if (projectStatus === 'assembling') percent = Math.max(92, Math.round((stepsDone / totalSteps) * 100));
  else percent = Math.min(90, Math.round((stepsDone / totalSteps) * 100));

  return { total, pending, ttsDone, rendering, rendered, failed, phase, percent };
}

function Step({
  active,
  done,
  icon,
  label,
}: {
  active: boolean;
  done: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
        done && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        active && !done && 'border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--foreground)]',
        !active && !done && 'border-[var(--border)] text-[var(--muted-foreground)]',
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function GenerationProgress({
  scenes,
  projectStatus,
  compact,
  failed,
}: {
  scenes: SceneProgress[];
  projectStatus: string;
  compact?: boolean;
  failed?: boolean;
}) {
  const { t } = useTranslation();
  const stats = computeGenerationStats(scenes, projectStatus);
  const ttsDone = stats.pending === 0 && stats.total > 0;
  const avatarDone = stats.rendered === stats.total && stats.total > 0;
  const assembleActive = projectStatus === 'assembling';
  const assembleDone = projectStatus === 'ready';

  const phaseMessage =
    stats.failed > 0
      ? t('videos.generation.failedScenes', { count: stats.failed })
      : stats.phase === 'tts'
        ? t('videos.generation.phaseTts', { done: stats.total - stats.pending, total: stats.total })
        : stats.phase === 'avatar'
          ? t('videos.generation.phaseAvatar', { done: stats.rendered, total: stats.total })
          : t('videos.generation.phaseAssemble');

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--muted-foreground)]">{phaseMessage}</span>
          <span className="font-mono font-medium">{stats.percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-[var(--radius-lg)] border p-5',
      failed
        ? 'border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5'
        : 'border-[var(--primary)]/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5',
    )}>
      <div className="mb-4 flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white',
          failed ? 'bg-red-500' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
        )}>
          {failed ? <AlertCircle className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{failed ? t('videos.generation.failedTitle') : t('videos.generation.title')}</h3>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{phaseMessage}</p>
        </div>
        <span className="shrink-0 font-mono text-lg font-semibold tabular-nums">{stats.percent}%</span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
          style={{ width: `${Math.max(stats.percent, 4)}%` }}
        />
      </div>

      <div className="mb-4 flex gap-2">
        <Step
          active={stats.phase === 'tts'}
          done={ttsDone}
          icon={<Mic className="h-3.5 w-3.5" />}
          label={t('videos.generation.stepTts')}
        />
        <Step
          active={stats.phase === 'avatar'}
          done={avatarDone}
          icon={<Film className="h-3.5 w-3.5" />}
          label={t('videos.generation.stepAvatar')}
        />
        <Step
          active={assembleActive}
          done={assembleDone}
          icon={<Layers className="h-3.5 w-3.5" />}
          label={t('videos.generation.stepAssemble')}
        />
      </div>

      {stats.failed > 0 ? (
        <p className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {t('videos.generation.failedHint')}
        </p>
      ) : (
        <p className="text-xs text-[var(--muted-foreground)]">{t('videos.generation.hint')}</p>
      )}
    </div>
  );
}
