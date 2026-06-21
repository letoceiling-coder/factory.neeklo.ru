import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/misc';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/useTranslation';

export function LoginPage() {
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError(t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-lg">
            <Factory className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">{t('app.name')}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('app.tagline')}</p>
        </div>

        <div className="glass card-glow rounded-[var(--radius-lg)] p-8">
          <h2 className="text-xl font-semibold">{t('auth.welcome')}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('auth.subtitle')}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label={t('auth.email')}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </Field>
            <Field label={t('auth.password')}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : t('auth.signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
