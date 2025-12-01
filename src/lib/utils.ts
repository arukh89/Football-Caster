import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format FBC amount from wei to human-readable format
 * @param weiAmount - Amount in wei (string or bigint)
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string with FBC suffix
 */
export function formatFBC(weiAmount: string | bigint, decimals: number = 2): string {
  try {
    // Convert to bigint if string
    const wei = typeof weiAmount === 'string' ? BigInt(weiAmount) : weiAmount;
    
    // FBC has 18 decimals
    const fbc = Number(wei) / 1e18;
    
    // Format with specified decimal places
    if (fbc < 0.01 && fbc > 0) {
      return `<0.01 FBC`;
    }
    
    return `${fbc.toFixed(decimals)} FBC`;
  } catch (error) {
    console.error('Error formatting FBC:', error);
    return '0 FBC';
  }
}
