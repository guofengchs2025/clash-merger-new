import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn('shrink-0 bg-border h-[1px] w-full', className)} />;
}
