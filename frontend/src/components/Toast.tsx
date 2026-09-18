import React from 'react';
import type { NotificationToast } from '../types';
import { AlertCircle, CheckCircle2, Info, X, ShieldAlert, Bell } from 'lucide-react';

interface ToastProps {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          warning: <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
        };

        const borderStyles = {
          info: 'border-cyan-500/30 shadow-cyan-950/40',
          success: 'border-emerald-500/30 shadow-emerald-950/40',
          warning: 'border-amber-500/30 shadow-amber-950/40',
          error: 'border-rose-500/30 shadow-rose-950/40',
        };

        const hasActions = toast.actions && toast.actions.length > 0;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex flex-col gap-2.5 p-4 rounded-2xl border bg-black/85 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-white/20 animate-fade-in-up ${borderStyles[toast.type]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                {icons[toast.type] || <Bell className="w-5 h-5 text-cyan-400 shrink-0" />}
                <p className="text-xs font-medium text-gray-100 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Action Buttons */}
            {hasActions && (
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.08] mt-1">
                {toast.actions!.map((action, idx) => {
                  let btnClass = 'bg-cyan-600 hover:bg-cyan-500 text-white';
                  if (action.variant === 'danger') {
                    btnClass = 'bg-rose-600 hover:bg-rose-500 text-white';
                  } else if (action.variant === 'success') {
                    btnClass = 'bg-emerald-600 hover:bg-emerald-500 text-white';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        action.onClick();
                        onDismiss(toast.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${btnClass}`}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
