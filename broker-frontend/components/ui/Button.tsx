'use client';

import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'navy' | 'danger';
type Size = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  flex?: boolean;
}

const SIZE_CLASS: Record<Size, string> = {
  md: '',
  sm: 'px-3.5 py-1.5 text-[13px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  flex = false,
  className = '',
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    block ? 'btn-block' : '',
    flex ? 'flex-1' : '',
    SIZE_CLASS[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={cls} {...rest} />;
}
