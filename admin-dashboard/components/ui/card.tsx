import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white dark:bg-slate-800 text-slate-950 dark:text-slate-50 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-xl font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50', className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-slate-600 dark:text-slate-400', className)} {...props} />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  );
}
