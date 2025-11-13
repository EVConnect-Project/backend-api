import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow-md dark:bg-blue-600 dark:hover:bg-blue-700': 
              variant === 'default',
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow-md dark:bg-red-600 dark:hover:bg-red-700': 
              variant === 'destructive',
            'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700':
              variant === 'outline',
            'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300': 
              variant === 'ghost',
            'h-10 px-4 py-2': size === 'default',
            'h-9 px-3 text-xs': size === 'sm',
            'h-11 px-8 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
