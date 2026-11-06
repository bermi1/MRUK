'use client';
import { createContext, useContext } from 'react';
import type { ClientMessageKey } from '@/lib/i18n';

type Dict = Partial<Record<ClientMessageKey, string>>;
const Ctx = createContext<Dict>({});

/** The few UI strings shared client components need, in the shopper's language (picked on the server). */
export function MessagesProvider({ messages, children }: { messages: Dict; children: React.ReactNode }) {
  return <Ctx.Provider value={messages}>{children}</Ctx.Provider>;
}

export function useMessages() {
  const m = useContext(Ctx);
  return (key: ClientMessageKey, vars?: Record<string, string | number>) => {
    let s = m[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}
