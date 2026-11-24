import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Modal } from './Modal.tsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'warning',
  isLoading = false,
}) => {
  const icon = {
    danger: <AlertTriangle className="h-6 w-6 text-rose-600" />,
    warning: <AlertTriangle className="h-6 w-6 text-amber-600" />,
    info: <Info className="h-6 w-6 text-sky-600" />,
    success: <CheckCircle className="h-6 w-6 text-emerald-600" />,
  }[type];

  const confirmBtnClass = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-sky-600 hover:bg-sky-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  }[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors shadow-xs ${confirmBtnClass}`}
          >
            {isLoading ? 'Đang xử lý...' : confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        <div className="shrink-0 p-2 rounded-full bg-slate-100">{icon}</div>
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
};
