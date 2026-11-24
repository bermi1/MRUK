'use client';
import { useState } from 'react';

/** Tabbed product showcase (Best sellers / New in / Deals). Panels are server-rendered; tabs only switch which one shows. */
export function ShowcaseTabs({ tabs, label }: { tabs: { id: string; label: string; panel: React.ReactNode }[]; label: string }) {
  const [on, setOn] = useState(tabs[0]?.id ?? '');
  return (
    <div className="mv-tabs-wrap">
      <div
        className="mv-tabs"
        role="tablist"
        aria-label={label}
        onKeyDown={(e) => {
          const k = tabs.findIndex((t) => t.id === on);
          const to = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
          if (to === null) return;
          e.preventDefault();
          const t = tabs[(to + tabs.length) % tabs.length]!;
          setOn(t.id);
          document.getElementById(`tab-${t.id}`)?.focus();
        }}
      >
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={on === t.id} tabIndex={on === t.id ? 0 : -1} className={on === t.id ? 'on' : ''} onClick={() => setOn(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={on !== t.id}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
