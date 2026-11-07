'use client';
import { createContext, useCallback, useContext, useState } from 'react';

export interface ToastAction {
  label: string;
  run: () => void;
}

const Ctx = createContext<(msg: string, action?: ToastAction) => void>(() => undefined);

/** One message at a time; with an action button it stays longer (6 s) so it can be used. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; action?: ToastAction } | null>(null);
  const show = useCallback((text: string, action?: ToastAction) => {
    const m = { text, action };
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), action ? 6000 : 2600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div className={`toast ${msg.action ? 'toast-act' : ''}`} role="status" aria-live="polite">
          <span>{msg.text}</span>
          {msg.action && (
            <button
              type="button"
              className="toast-btn"
              onClick={() => {
                setMsg(null);
                msg.action!.run();
              }}
            >
              {msg.action.label}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
