import React from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.memo<ButtonProps>(({
  children,
  variant = 'emerald',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 select-none rounded-2xl active:scale-[0.97] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none';

  const sizeClasses = {
    sm: 'text-[11px] px-3.5 py-2 font-black gap-1.5',
    md: 'text-xs px-4.5 py-3.5 gap-2',
    lg: 'text-sm px-5 py-4 gap-2.5',
  };

  const variantClasses = {
    emerald: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10 focus:ring-emerald-500',
    sky: 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/10 focus:ring-sky-500',
    amber: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/10 focus:ring-amber-500',
    rose: 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/10 focus:ring-rose-500',
    slate: 'bg-slate-800 hover:bg-slate-705 text-slate-100 border border-slate-700/80 focus:ring-slate-700',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 focus:ring-slate-800',
  };

  const widthClass = fullWidth ? 'w-full flex' : '';

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...(props as any)}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';
