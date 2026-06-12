import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  as?: 'input' | 'select' | 'textarea';
  children?: React.ReactNode; // For select options
}

export const Input = React.memo<InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  as = 'input',
  children,
  className = '',
  id,
  ...props
}) => {
  const selectFocus = 'focus:border-emerald-500 focus:ring-emerald-500/25';

  const baseInputStyles = `w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 font-medium transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed ${
    leftIcon ? 'pl-11' : ''
  } ${error ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20' : ''}`;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label id={id ? `${id}-label` : undefined} className="text-[10px] sm:text-xs font-bold text-slate-400 select-none px-1 uppercase block">
          {label}
        </label>
      )}

      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-4 text-slate-500 pointer-events-none flex items-center justify-center shrink-0">
            {leftIcon}
          </div>
        )}

        {as === 'textarea' ? (
          <textarea
            id={id}
            className={`${baseInputStyles} resize-none min-h-[90px]`}
            {...(props as any)}
          />
        ) : as === 'select' ? (
          <select
            id={id}
            className={`${baseInputStyles} appearance-none pr-10`}
            {...(props as any)}
          >
            {children}
          </select>
        ) : (
          <input
            id={id}
            className={baseInputStyles}
            {...(props as any)}
          />
        )}

        {as === 'select' && (
          <div className="absolute right-4 pointer-events-none text-slate-400 select-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {error ? (
        <span className="text-[10px] font-bold text-rose-400 px-1">{error}</span>
      ) : helperText ? (
        <span className="text-[9px] font-medium text-slate-500 px-1">{helperText}</span>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
