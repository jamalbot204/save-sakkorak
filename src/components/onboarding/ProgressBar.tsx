import React from 'react';

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export const ProgressBar = React.memo(({ step, totalSteps }: ProgressBarProps) => {
  const progressPct = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex mb-8 shrink-0 select-none">
      <div 
        className="bg-emerald-500 h-full transition-all duration-300 ease-out transform-gpu" 
        style={{ width: `${Math.max(progressPct, 8)}%` }}
      ></div>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';
