import { Sun, Moon, Languages, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Locale } from '@/i18n';

export function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Languages className="h-4 w-4 text-[var(--primary)]" /> {t('settings.language')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {(['ru', 'en'] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn('rounded-[var(--radius-md)] border p-4 text-sm font-medium transition-all', locale === l ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--muted)]')}
              >
                {l === 'ru' ? 'Русский' : 'English'}
              </button>
            ))}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h3 className="mb-4 font-semibold">{t('settings.appearance')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTheme('light')} className={cn('flex items-center justify-center gap-2 rounded-[var(--radius-md)] border p-4 text-sm font-medium', theme === 'light' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--muted)]')}>
              <Sun className="h-4 w-4" /> {t('settings.themeLight')}
            </button>
            <button onClick={() => setTheme('dark')} className={cn('flex items-center justify-center gap-2 rounded-[var(--radius-md)] border p-4 text-sm font-medium', theme === 'dark' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--muted)]')}>
              <Moon className="h-4 w-4" /> {t('settings.themeDark')}
            </button>
          </div>
        </CardContent></Card>

        <Card className="lg:col-span-2"><CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><User className="h-4 w-4 text-[var(--primary)]" /> {t('settings.profile')}</h3>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-xl font-bold text-white">
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{user?.name || user?.email}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{user?.email}</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">{t(`users.roles.${user?.role}`)}</div>
            </div>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
