import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, Spinner, Field } from '@/components/ui/misc';
import { useTranslation } from '@/i18n/useTranslation';

interface U { id: string; email: string; name?: string; role: string; }

export function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ email: '', password: '', name: '', role: 'user' });

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get<U[]>('/users') });
  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); setForm({ email: '', password: '', name: '', role: 'user' }); },
  });
  const delMut = useMutation({ mutationFn: (id: string) => api.del(`/users/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });

  return (
    <div>
      <PageHeader title={t('users.title')} subtitle={t('users.subtitle')} action={<Button variant="gradient" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('users.new')}</Button>} />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
              <tr><th className="p-4">{t('auth.email')}</th><th className="p-4">{t('common.name')}</th><th className="p-4">{t('users.role')}</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-4 font-medium">{u.email}</td>
                  <td className="p-4 text-[var(--muted-foreground)]">{u.name || '—'}</td>
                  <td className="p-4"><Badge variant={u.role === 'admin' ? 'default' : 'muted'}>{t(`users.roles.${u.role}`)}</Badge></td>
                  <td className="p-4 text-right"><button onClick={() => delMut.mutate(u.id)} className="text-[var(--muted-foreground)] hover:text-red-500"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={t('users.new')}>
        <div className="space-y-4">
          <Field label={t('auth.email')}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={t('common.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t('auth.password')}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label={t('users.role')}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">{t('users.roles.user')}</option>
              <option value="admin">{t('users.roles.admin')}</option>
            </Select>
          </Field>
          <Button variant="gradient" className="w-full" onClick={() => createMut.mutate(form)} disabled={!form.email || !form.password}>{t('common.create')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
