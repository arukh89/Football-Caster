import { cn } from '@/lib/utils';

interface StatPillProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300',
  success: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300',
  warning: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300',
  danger: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
};

export function StatPill({
  label,
  value,
  variant = 'default',
  icon,
  className,
}: StatPillProps): JSX.Element {
  return (
    <div
      className={cn(
        'stat-pill',
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
