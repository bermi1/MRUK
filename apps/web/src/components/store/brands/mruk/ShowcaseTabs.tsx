'use client';
import { useState } from 'react';

/** Tabbed product showcase (Best sellers / New in / Deals). Panels are server-rendered; tabs only switch which one shows. */
export function ShowcaseTabs({ tabs, label }: { tabs: { id: string; label: string; panel: React.ReactNode }[]; label: string }) {
  const [on, setOn] = useState(tabs[0]?.id ?? '');
  return (
    <div className="mv-tabs-wrap">
      <div className="mv-tabs" role="tablist" aria-label={label}>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={on === t.id} className={on === t.id ? 'on' : ''} onClick={() => setOn(t.id)}>
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
