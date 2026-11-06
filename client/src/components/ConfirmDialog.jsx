import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // danger, warning, info
}) {
  const variantStyles = {
    danger: {
      icon: 'text-red-400',
      button: 'btn-danger',
    },
    warning: {
      icon: 'text-yellow-400',
      button: 'btn-gold',
    },
    info: {
      icon: 'text-blue-400',
      button: 'btn-primary',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center py-2">
        <div className={`mx-auto w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 ${styles.icon}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn-secondary px-8">
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`${styles.button} px-8`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
