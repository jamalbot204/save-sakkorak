/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden select-none">
      {/* Dark backdrop overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 transform-gpu translate-z-0"
      ></div>

      {/* Slide-Up Bottom Drawer with hardware GPU acceleration and spring-physics active scale support */}
      <div 
        className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-slate-900 border-t border-slate-800 rounded-t-[28px] shadow-2xl z-50 flex flex-col transform-gpu translate-z-0 will-change-transform transition-all duration-300 ease-out pb-[env(safe-area-inset-bottom)]"
        style={{
          animation: 'slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Draw Pull Handle Bar */}
        <div className="w-full h-7 flex items-center justify-center cursor-pointer shrink-0" onClick={onClose}>
          <div className="w-10 h-1.5 bg-slate-700/60 rounded-full"></div>
        </div>

        {/* Title Header */}
        <div className="px-5 pb-3 pt-1 border-b border-slate-800/60 shrink-0 text-center">
          <h2 className="text-sm font-semibold text-slate-300 tracking-wide">{title}</h2>
        </div>

        {/* Custom Container Operations */}
        <div className="flex-1 overflow-y-auto max-h-[400px] p-5">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%) translateZ(0);
          }
          to {
            transform: translateY(0) translateZ(0);
          }
        }
      `}</style>
    </div>
  );
};
