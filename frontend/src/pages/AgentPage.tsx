import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, Plus, Wrench, ShieldAlert, User, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface Msg { id: string; role: string; content: string; toolName?: string; pending: boolean; toolCalls?: any; }
interface Session { id: string; title: string; messages?: Msg[]; }

export function AgentPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: sessions } = useQuery({ queryKey: ['agentSessions'], queryFn: () => api.get<Session[]>('/agent/sessions') });
  const { data: session } = useQuery({
    queryKey: ['agentSession', activeId],
    queryFn: () => api.get<Session>(`/agent/sessions/${activeId}`),
    enabled: !!activeId,
  });

  const createMut = useMutation({
    mutationFn: () => api.post<Session>('/agent/sessions', {}),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: ['agentSessions'] }); setActiveId(s.id); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/agent/sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agentSessions'] }); setActiveId(null); },
  });
  const sendMut = useMutation({
    mutationFn: (content: string) => api.post<Session>(`/agent/sessions/${activeId}/messages`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agentSession', activeId] }),
  });
  const confirmMut = useMutation({
    mutationFn: (p: { messageId: string; approved: boolean }) => api.post(`/agent/messages/${p.messageId}/confirm`, { approved: p.approved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agentSession', activeId] }),
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [session?.messages]);

  const send = async () => {
    if (!input.trim()) return;
    let sid = activeId;
    if (!sid) { const s = await createMut.mutateAsync(); sid = s.id; }
    const text = input;
    setInput('');
    sendMut.mutate(text);
  };

  const messages = (session?.messages || []).filter((m) => m.role !== 'system' && m.role !== 'tool');
  const pending = (session?.messages || []).find((m) => m.pending);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="hidden w-60 shrink-0 flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3 md:flex">
        <Button variant="gradient" className="mb-3" onClick={() => createMut.mutate()}><Plus className="h-4 w-4" /> {t('agent.newSession')}</Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {sessions?.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={cn('group flex cursor-pointer items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm', activeId === s.id ? 'bg-[var(--primary)]/12 text-[var(--primary)]' : 'hover:bg-[var(--muted)]')}
            >
              <span className="truncate">{s.title}</span>
              <button onClick={(e) => { e.stopPropagation(); delMut.mutate(s.id); }} className="hidden text-[var(--muted-foreground)] hover:text-red-500 group-hover:block">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white"><Bot className="h-4 w-4" /></div>
          <div>
            <div className="text-sm font-semibold">{t('agent.title')}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{t('agent.subtitle')}</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-[var(--muted-foreground)]">
              <Bot className="mb-3 h-12 w-12" />
              <p className="text-sm">{t('agent.empty')}</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : '')}>
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', m.role === 'user' ? 'bg-[var(--muted-foreground)]' : 'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]')}>
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn('max-w-[75%] rounded-[var(--radius-md)] px-4 py-2.5 text-sm', m.role === 'user' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)]')}>
                {m.toolName && !m.content && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs opacity-80"><Wrench className="h-3 w-3" /> {t('agent.toolCall')}: {m.toolName}</div>
                )}
                {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                {m.pending && (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-amber-500/40 bg-amber-500/10 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-500"><ShieldAlert className="h-4 w-4" /> {t('agent.confirmTitle')}</div>
                    <p className="mb-2 text-xs">{t('agent.confirmDesc')}: <b>{m.toolName}</b></p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="gradient" onClick={() => confirmMut.mutate({ messageId: m.id, approved: true })}>{t('common.confirm')}</Button>
                      <Button size="sm" variant="outline" onClick={() => confirmMut.mutate({ messageId: m.id, approved: false })}>{t('common.reject')}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {(sendMut.isPending || confirmMut.isPending) && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Spinner className="h-4 w-4" /> {t('agent.thinking')}</div>
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={t('agent.placeholder')}
              disabled={!!pending || sendMut.isPending}
            />
            <Button variant="gradient" onClick={send} disabled={!input.trim() || !!pending || sendMut.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
