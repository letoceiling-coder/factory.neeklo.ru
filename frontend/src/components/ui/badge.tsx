import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info';

const styles: Record<Variant, string> = {
  default: 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30',
  success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-500 border-red-500/30',
  muted: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  info: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
