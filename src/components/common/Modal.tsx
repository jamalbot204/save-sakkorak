import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Modal = React.memo<ModalProps>(({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidth = 'sm',
}) => {
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

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
            style={{ willChange: 'opacity' }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            style={{ willChange: 'transform, opacity' }}
            className={`w-full ${widthClasses[maxWidth]} bg-slate-900 border border-slate-800 rounded-[32px] p-5 shadow-2xl relative flex flex-col max-h-[90vh] z-10 overflow-hidden`}
          >
            {/* Close handler */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 bg-slate-800/80 text-slate-400 hover:text-slate-200 rounded-full transition-all active:scale-95 z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Content */}
            {title && (
              <div className="flex items-center gap-2 mb-4 shrink-0 select-none">
                {icon && (
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                    {icon}
                  </div>
                )}
                <h2 className="text-sm sm:text-base font-extrabold text-slate-100">{title}</h2>
              </div>
            )}

            {/* Content Frame */}
            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

Modal.displayName = 'Modal';
