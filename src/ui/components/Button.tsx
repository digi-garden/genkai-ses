import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'link';

const CLASS: Record<Variant, string> = {
  primary: 'min-h-12 rounded-[10px] bg-primary px-5 font-bold text-on-primary disabled:opacity-40',
  secondary: 'min-h-11 rounded-[10px] border border-border-strong px-4 text-text disabled:opacity-40',
  link: 'min-h-11 px-2 text-text-muted underline underline-offset-4',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${CLASS[variant]} text-[15px] ${className}`} {...rest} />;
}
