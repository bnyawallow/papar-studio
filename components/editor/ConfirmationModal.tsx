
import React from 'react';
import { ExclamationTriangleIcon } from '../icons/Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = "Delete",
    cancelText = "Cancel"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-background-secondary border border-border-default rounded-lg shadow-elevation3 w-full max-w-md p-6 m-4 animate-scale-in">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-accent-danger/10 sm:mx-0 sm:h-10 sm:w-10">
                <ExclamationTriangleIcon className="h-6 w-6 text-accent-danger" aria-hidden="true" />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary leading-6">{title}</h3>
                <div className="mt-2">
                    <p className="text-sm text-text-secondary">{message}</p>
                </div>
            </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-background-tertiary border border-border-default text-text-primary rounded-md hover:bg-background-hover focus:outline-none focus:ring-2 focus:ring-accent-primary font-medium text-sm transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 bg-accent-danger text-white rounded-md hover:bg-accent-danger/90 focus:outline-none focus:ring-2 focus:ring-accent-danger font-medium text-sm transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
