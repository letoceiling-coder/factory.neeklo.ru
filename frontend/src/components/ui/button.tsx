import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-[0_8px_24px_-8px_var(--primary)]',
        gradient:
          'text-white bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] hover:opacity-95 shadow-[0_10px_30px_-10px_var(--primary)]',
        outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--muted)]',
        ghost: 'hover:bg-[var(--muted)]',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        secondary: 'bg-[var(--muted)] text-[var(--foreground)] hover:opacity-80',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
