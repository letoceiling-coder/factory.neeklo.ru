import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plug, Check, X, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface Provider { slug: string; type: string; label: string; enabled: boolean; configured: boolean; keyMask: string; }

export function IntegrationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [keys, setKeys] = useState<Record<string, string>>({});

  const { data: providers, isLoading } = useQuery({ queryKey: ['providers'], queryFn: () => api.get<Provider[]>('/providers') });
  const saveMut = useMutation({
    mutationFn: (p: { slug: string; body: any }) => api.put(`/providers/${p.slug}`, p.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });

  return (
    <div>
      <PageHeader title={t('integrations.title')} subtitle={t('integrations.subtitle')} />
      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers?.map((p) => (
            <Card key={p.slug}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted)]"><Plug className="h-5 w-5 text-[var(--primary)]" /></div>
                    <div>
                      <div className="font-semibold">{p.label}</div>
                      <Badge variant="muted">{t(`integrations.types.${p.type}`)}</Badge>
                    </div>
                  </div>
                  {p.configured ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-500"><Check className="h-4 w-4" /> {t('integrations.configured')}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><X className="h-4 w-4" /> {t('integrations.notConfigured')}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      type="password"
                      className="pl-9"
                      placeholder={p.configured ? p.keyMask : t('integrations.apiKey')}
                      value={keys[p.slug] || ''}
                      onChange={(e) => setKeys({ ...keys, [p.slug]: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => saveMut.mutate({ slug: p.slug, body: { type: p.type, slug: p.slug, label: p.label, apiKey: keys[p.slug] } })}
                    disabled={!keys[p.slug]}
                  >
                    {t('integrations.save')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
