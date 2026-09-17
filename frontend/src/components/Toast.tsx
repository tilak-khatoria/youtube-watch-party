import React from 'react';
import type { NotificationToast } from '../types';
import { AlertCircle, CheckCircle2, Info, X, ShieldAlert } from 'lucide-react';

interface ToastProps {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          warning: <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
        };

        const borderColors = {
          info: 'border-indigo-500/40 bg-[#14182b]/95 text-indigo-100',
          success: 'border-emerald-500/40 bg-[#11241f]/95 text-emerald-100',
          warning: 'border-amber-500/40 bg-[#281e10]/95 text-amber-100',
          error: 'border-rose-500/40 bg-[#2b1216]/95 text-rose-100',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md animate-slide-in ${borderColors[toast.type]}`}
          >
            <div className="flex items-center gap-2.5">
              {icons[toast.type]}
              <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-md hover:bg-white/10 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
