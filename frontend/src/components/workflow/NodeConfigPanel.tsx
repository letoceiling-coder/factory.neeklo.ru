import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useTranslation } from '@/i18n/useTranslation';

interface Avatar { id: string; name: string; }
interface Voice { id: string; name: string; }

interface Props {
  nodeType: string;
  label: string;
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-[var(--foreground)]">{label}</span>
      {hint && <p className="text-[10px] leading-snug text-[var(--muted-foreground)]">{hint}</p>}
      {children}
    </label>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

export function NodeConfigPanel({ nodeType, label, config, onChange }: Props) {
  const { t } = useTranslation();
  const { data: avatars } = useQuery({ queryKey: ['avatars'], queryFn: () => api.get<Avatar[]>('/avatars') });
  const { data: voices } = useQuery({ queryKey: ['voices'], queryFn: () => api.get<Voice[]>('/voices') });

  const desc = t(`nodeBuilder.nodeHelp.${nodeType}`, '');

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">{nodeType}</div>
        {desc && <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{desc}</p>}
      </div>

      {nodeType === 'input.brief' && (
        <Field label={t('nodeBuilder.fields.briefText')} hint={t('nodeBuilder.fields.briefTextHint')}>
          <Textarea rows={8} value={config.text || ''} onChange={(e) => onChange('text', e.target.value)} />
        </Field>
      )}

      {nodeType === 'ai.scriptwriter' && (
        <>
          <Field label={t('nodeBuilder.fields.targetScenes')}>
            <Input type="number" min={1} max={20} value={config.targetScenes ?? 6} onChange={(e) => onChange('targetScenes', +e.target.value)} />
          </Field>
          <Field label={t('nodeBuilder.fields.tone')}>
            <Input value={config.tone || ''} onChange={(e) => onChange('tone', e.target.value)} />
          </Field>
          <Field label={t('nodeBuilder.fields.language')}>
            <Select value={config.language || 'ru'} onChange={(e) => onChange('language', e.target.value)}>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </Select>
          </Field>
          <Field label={t('nodeBuilder.fields.model')} hint={t('nodeBuilder.fields.modelHint')}>
            <Input value={config.model || ''} onChange={(e) => onChange('model', e.target.value)} placeholder="openai/gpt-4o-mini" />
          </Field>
        </>
      )}

      {nodeType === 'logic.scene_split' && (
        <Field label={t('nodeBuilder.fields.maxChars')} hint={t('nodeBuilder.fields.maxCharsHint')}>
          <Input type="number" min={100} max={800} value={config.maxCharsPerScene ?? 350} onChange={(e) => onChange('maxCharsPerScene', +e.target.value)} />
        </Field>
      )}

      {nodeType === 'voice.tts' && (
        <>
          <Field label={t('nodeBuilder.fields.voice')}>
            <Select value={config.voiceId || ''} onChange={(e) => onChange('voiceId', e.target.value)}>
              <option value="">{t('nodeBuilder.fields.selectVoice')}</option>
              {voices?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label={t('nodeBuilder.fields.stability')}>
            <Input type="number" step={0.05} min={0} max={1} value={config.stability ?? 0.5} onChange={(e) => onChange('stability', +e.target.value)} />
          </Field>
          <Field label={t('nodeBuilder.fields.similarity')}>
            <Input type="number" step={0.05} min={0} max={1} value={config.similarityBoost ?? 0.75} onChange={(e) => onChange('similarityBoost', +e.target.value)} />
          </Field>
          <Field label={t('nodeBuilder.fields.speed')}>
            <Input type="number" step={0.1} min={0.5} max={2} value={config.speed ?? 1} onChange={(e) => onChange('speed', +e.target.value)} />
          </Field>
        </>
      )}

      {nodeType === 'avatar.render' && (
        <>
          <Field label={t('nodeBuilder.fields.engine')}>
            <Select value={config.engine || 'heygen'} onChange={(e) => onChange('engine', e.target.value)}>
              <option value="heygen">HeyGen</option>
              <option value="hedra">Hedra</option>
              <option value="did">D-ID</option>
            </Select>
          </Field>
          <Field label={t('nodeBuilder.fields.avatar')}>
            <Select value={config.avatarId || ''} onChange={(e) => onChange('avatarId', e.target.value)}>
              <option value="">{t('nodeBuilder.fields.selectAvatar')}</option>
              {avatars?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </>
      )}

      {nodeType === 'edit.background' && (
        <>
          <Field label={t('nodeBuilder.fields.bgType')}>
            <Select value={config.type || 'color'} onChange={(e) => onChange('type', e.target.value)}>
              <option value="color">{t('nodeBuilder.fields.bgColor')}</option>
              <option value="image">{t('nodeBuilder.fields.bgImage')}</option>
            </Select>
          </Field>
          {config.type !== 'image' ? (
            <Field label={t('nodeBuilder.fields.bgColorValue')}>
              <Input type="color" value={config.value || '#0a0a0f'} onChange={(e) => onChange('value', e.target.value)} className="h-10 p-1" />
            </Field>
          ) : (
            <Field label={t('nodeBuilder.fields.bgImageKey')} hint={t('nodeBuilder.fields.bgImageKeyHint')}>
              <Input value={config.imageKey || ''} onChange={(e) => onChange('imageKey', e.target.value)} placeholder="factory/uploads/..." />
            </Field>
          )}
        </>
      )}

      {nodeType === 'edit.caption' && (
        <>
          <Checkbox checked={!!config.enabled} onChange={(v) => onChange('enabled', v)} label={t('nodeBuilder.fields.captionsEnabled')} />
          <Field label={t('nodeBuilder.fields.captionStyle')}>
            <Select value={config.style || 'bottom'} onChange={(e) => onChange('style', e.target.value)}>
              <option value="bottom">{t('nodeBuilder.fields.captionBottom')}</option>
              <option value="top">{t('nodeBuilder.fields.captionTop')}</option>
            </Select>
          </Field>
        </>
      )}

      {nodeType === 'edit.transition' && (
        <>
          <Field label={t('nodeBuilder.fields.transitionKind')}>
            <Select value={config.kind || 'fade'} onChange={(e) => onChange('kind', e.target.value)}>
              <option value="cut">{t('nodeBuilder.fields.transitionCut')}</option>
              <option value="fade">{t('nodeBuilder.fields.transitionFade')}</option>
              <option value="crossfade">{t('nodeBuilder.fields.transitionCrossfade')}</option>
            </Select>
          </Field>
          <Field label={t('nodeBuilder.fields.transitionDuration')}>
            <Input type="number" step={0.1} min={0} max={2} value={config.durationSec ?? 0.5} onChange={(e) => onChange('durationSec', +e.target.value)} />
          </Field>
        </>
      )}

      {nodeType === 'edit.music' && (
        <>
          <Checkbox checked={config.enabled !== false} onChange={(v) => onChange('enabled', v)} label={t('nodeBuilder.fields.musicEnabled')} />
          <Field label={t('nodeBuilder.fields.musicAsset')} hint={t('nodeBuilder.fields.musicAssetHint')}>
            <Input value={config.assetKey || ''} onChange={(e) => onChange('assetKey', e.target.value)} placeholder="factory/uploads/audio/..." />
          </Field>
          <Field label={t('nodeBuilder.fields.musicVolume')}>
            <Input type="number" step={0.05} min={0} max={1} value={config.volume ?? 0.12} onChange={(e) => onChange('volume', +e.target.value)} />
          </Field>
        </>
      )}

      {nodeType === 'assemble.timeline' && (
        <>
          <Checkbox checked={!!config.withCaptions} onChange={(v) => onChange('withCaptions', v)} label={t('nodeBuilder.fields.assembleCaptions')} />
          <Field label={t('nodeBuilder.fields.aspectRatio')}>
            <Select value={config.aspectRatio || '16:9'} onChange={(e) => onChange('aspectRatio', e.target.value)}>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
            </Select>
          </Field>
        </>
      )}

      {nodeType === 'output.video' && (
        <>
          <Field label={t('nodeBuilder.fields.outputFormat')}>
            <Select value={config.format || 'mp4'} onChange={(e) => onChange('format', e.target.value)}>
              <option value="mp4">MP4</option>
            </Select>
          </Field>
          <Field label={t('nodeBuilder.fields.outputQuality')}>
            <Select value={config.quality || 'high'} onChange={(e) => onChange('quality', e.target.value)}>
              <option value="high">{t('nodeBuilder.fields.qualityHigh')}</option>
              <option value="medium">{t('nodeBuilder.fields.qualityMedium')}</option>
            </Select>
          </Field>
          <p className="text-xs text-amber-500/90">{t('nodeBuilder.fields.outputNote')}</p>
        </>
      )}
    </div>
  );
}
