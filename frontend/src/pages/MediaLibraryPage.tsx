import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Upload, FileAudio, FileVideo, FileImage, File } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Spinner, EmptyState } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface Asset { id: string; kind: string; name?: string; key: string; size?: number; url?: string; }

const icons: Record<string, any> = { audio: FileAudio, video: FileVideo, image: FileImage, other: File };

export function MediaLibraryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');

  const { data: assets, isLoading } = useQuery({ queryKey: ['assets', filter], queryFn: () => api.get<Asset[]>(`/assets${filter ? `?kind=${filter}` : ''}`) });
  const uploadMut = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.upload('/assets/upload', fd); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });

  return (
    <div>
      <PageHeader
        title={t('media.title')}
        subtitle={t('media.subtitle')}
        action={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            <Upload className="h-4 w-4" /> {t('media.upload')}
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMut.mutate(e.target.files[0])} />
          </label>
        }
      />

      <div className="mb-4 flex gap-2">
        {['', 'video', 'audio', 'image'].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn('rounded-full border px-3 py-1 text-xs', filter === k ? 'border-[var(--primary)] bg-[var(--primary)]/12 text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)]')}
          >
            {k ? t(`media.kinds.${k}`) : t('common.all')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !assets || assets.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-10 w-10" />} text={t('common.empty')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => {
            const Icon = icons[a.kind] || File;
            return (
              <Card key={a.id} className="overflow-hidden">
                <div className="flex aspect-video items-center justify-center bg-[var(--muted)]">
                  {a.kind === 'image' && a.url ? (
                    <img src={a.url} className="h-full w-full object-cover" />
                  ) : a.kind === 'video' && a.url ? (
                    <video src={a.url} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-10 w-10 text-[var(--muted-foreground)]" />
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="truncate text-xs font-medium">{a.name || a.key.split('/').pop()}</div>
                  <Badge variant="muted" className="mt-1">{t(`media.kinds.${a.kind}`)}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
