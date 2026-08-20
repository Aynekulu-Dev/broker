'use client';

import { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: number;
}

const PADDING_CLASS: Record<number, string> = {
  0: 'p-0',
  12: 'p-3',
  14: 'p-3.5',
  16: 'p-4',
  20: 'p-5',
  24: 'p-6',
};

export function Card({ padding = 16, className = '', style, ...rest }: CardProps) {
  const paddingClass = PADDING_CLASS[padding];
  return (
    <div
      className={`paper-card ${paddingClass ?? ''} ${className}`.trim()}
      style={paddingClass ? style : { padding, ...style }}
      {...rest}
    />
  );
}
