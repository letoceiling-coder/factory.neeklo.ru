import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users2,
  UserSquare2,
  AudioLines,
  Clapperboard,
  Workflow,
  Bot,
  ListChecks,
  Plug,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Locale } from '@/i18n';

interface NavItem {
  to: string;
  labelKey: string;
  icon: any;
  adminOnly?: boolean;
}

const groups: { sectionKey: string; items: NavItem[] }[] = [
  {
    sectionKey: 'nav.sections.main',
    items: [
      { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/agent', labelKey: 'nav.agent', icon: Bot },
    ],
  },
  {
    sectionKey: 'nav.sections.studio',
    items: [
      { to: '/videos', labelKey: 'nav.videoStudio', icon: Clapperboard },
      { to: '/avatars', labelKey: 'nav.avatarStudio', icon: UserSquare2 },
      { to: '/voices', labelKey: 'nav.voiceStudio', icon: AudioLines },
      { to: '/builder', labelKey: 'nav.nodeBuilder', icon: Workflow },
      { to: '/jobs', labelKey: 'nav.jobs', icon: ListChecks },
      { to: '/media', labelKey: 'nav.media', icon: FolderOpen },
    ],
  },
  {
    sectionKey: 'nav.sections.system',
    items: [
      { to: '/integrations', labelKey: 'nav.integrations', icon: Plug, adminOnly: true },
      { to: '/users', labelKey: 'nav.users', icon: Users2, adminOnly: true },
      { to: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const Sidebar = (
    <div className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white">
          <Factory className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">{t('app.name')}</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">{t('app.tagline')}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.sectionKey}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t(group.sectionKey)}
            </div>
            <div className="space-y-1">
              {group.items
                .filter((i) => !i.adminOnly || user?.role === 'admin')
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--primary)]/12 text-[var(--primary)]'
                          : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    {t(item.labelKey)}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-red-500"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t('auth.logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">{Sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{Sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/60 px-4 backdrop-blur">
          <button className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
              {(['ru', 'en'] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold uppercase transition-colors',
                    locale === l ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--muted)]"
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <div
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] px-3 text-sm"
              onClick={() => navigate('/settings')}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-[11px] font-bold text-white">
                {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden text-xs text-[var(--muted-foreground)] sm:block">{user?.email}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
