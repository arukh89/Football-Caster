import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFBC } from '@/lib/wallet-utils';

interface PriceTagProps {
  type: 'bid' | 'ask' | 'fixed' | 'auction';
  priceFbc?: string;
  pointValue?: number;
  delta?: number;
  className?: string;
}

export function PriceTag({
  type,
  priceFbc,
  pointValue,
  delta,
  className,
}: PriceTagProps): JSX.Element {
  const label = {
    bid: 'Bid',
    ask: 'Ask',
    fixed: 'Price',
    auction: 'Current',
  }[type];

  return (
    <div className={cn('glass rounded-lg px-3 py-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-bold',
            delta > 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {delta > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(delta)}%</span>
          </span>
        )}
      </div>
      <div className="mt-1">
        {priceFbc && (
          <div className="text-lg font-bold">
            {formatFBC(priceFbc)} FBC
          </div>
        )}
        {pointValue !== undefined && (
          <div className="text-sm text-muted-foreground">
            {pointValue} Pt
          </div>
        )}
      </div>
    </div>
  );
}
