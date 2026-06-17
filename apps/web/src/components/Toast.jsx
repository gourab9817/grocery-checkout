/**
 * Minimal toast — renders at bottom-right, auto-dismisses after 3s.
 * Usage: import { useToast } from '../components/Toast.jsx'
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl shadow-bloom
              border backdrop-blur-sm max-w-xs
              ${t.type === 'error'
                ? 'bg-white border-terra/20 text-forest'
                : 'bg-white border-stone text-forest'}
              animate-[slideIn_0.35s_ease-out]
            `}
          >
            {t.type === 'error'
              ? <AlertCircle size={18} className="text-terra mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              : <CheckCircle size={18} className="text-sage mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            }
            <span className="text-sm leading-relaxed flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-forest/40 hover:text-forest transition-colors duration-200 mt-0.5 flex-shrink-0"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx.show;
}
