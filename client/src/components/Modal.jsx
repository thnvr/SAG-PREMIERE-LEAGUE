import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-6xl',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className={`relative w-full ${selectedSize} max-h-[92vh] flex flex-col bg-[#14151b] rounded-2xl shadow-2xl shadow-black/80 border border-[#2b2e3c] animate-scale-in overflow-hidden`}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#262833] bg-[#111215]/80 flex-shrink-0">
            {title && <h2 className="text-sm sm:text-base font-bold text-white truncate pr-2">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0 ml-auto"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto touch-scroll flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
