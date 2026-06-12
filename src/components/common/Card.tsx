import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'glass' | 'accent' | 'dotted';
  accentColor?: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card = React.memo<CardProps>(({
  children,
  variant = 'glass',
  accentColor = 'slate',
  padding = 'md',
  header,
  footer,
  className = '',
  ...props
}) => {
  const baseCard = 'rounded-[32px] border transition-all duration-300 relative overflow-hidden flex flex-col';

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  const variantClasses = {
    glass: 'bg-slate-900/40 border-slate-800/60 shadow-lg shadow-black/10 backdrop-blur-sm',
    flat: 'bg-slate-900 border-slate-800/80 shadow-md',
    accent: {
      emerald: 'bg-gradient-to-tr from-emerald-950/10 to-teal-900/5 border-emerald-500/10 shadow-lg shadow-emerald-950/5',
      sky: 'bg-gradient-to-tr from-sky-950/10 to-blue-900/5 border-sky-500/10 shadow-lg shadow-sky-950/5',
      amber: 'bg-gradient-to-tr from-amber-950/10 to-yellow-900/5 border-amber-500/10 shadow-lg shadow-amber-950/5',
      rose: 'bg-gradient-to-tr from-rose-950/10 to-red-900/5 border-rose-500/10 shadow-lg shadow-rose-950/5',
      slate: 'bg-slate-900/30 border-slate-800/60 shadow-md',
    }[accentColor],
    dotted: 'bg-slate-900/30 border-dashed border-slate-800/80',
  };

  return (
    <div className={`${baseCard} ${variantClasses[variant] || ''} ${className}`} {...props}>
      {header && (
        <div className="px-5 py-4 border-b border-slate-800/40 shrink-0">
          {header}
        </div>
      )}
      
      <div className={`flex-1 ${paddingClasses[padding]}`}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3.5 bg-slate-950/20 border-t border-slate-800/40 mt-auto shrink-0 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
});

Card.displayName = 'Card';
