import React, { useState, ReactNode } from 'react';
import { Header } from './Header.tsx';
import { Sidebar } from './Sidebar.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, dismissToast } = useApp();

  return (
    <div className="flex min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toast.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-rose-600" />
              ) : toast.type === 'info' ? (
                <Info className="h-5 w-5 text-sky-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
