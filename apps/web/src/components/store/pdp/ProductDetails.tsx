'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '../../icons';

export interface DetailSection {
  /** Also the URL fragment (#specs) that opens this section. */
  id: string;
  title: string;
  content: React.ReactNode;
}

/**
 * Accessible accordion (WAI-ARIA pattern): each heading holds a button with aria-expanded and
 * aria-controls; Up/Down/Home/End move between headings. Panels stay in the HTML (good for
 * search engines and no-JS) and are made inert while collapsed. The first section starts open.
 * A matching URL fragment (#specs, #delivery …) opens and scrolls to its section.
 */
export function ProductDetails({ title, sections }: { title: string; sections: DetailSection[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(sections[0] ? [sections[0].id] : []));
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  const fromHash = useCallback(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !sections.some((s) => s.id === id)) return;
    setOpen((o) => new Set(o).add(id));
    // Wait for the panel to expand before scrolling, so the heading lands in view.
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [sections]);

  useEffect(() => {
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [fromHash]);

  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const last = sections.length - 1;
    const to = e.key === 'ArrowDown' ? (i === last ? 0 : i + 1) : e.key === 'ArrowUp' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    btns.current[to]?.focus();
  };

  if (!sections.length) return null;
  return (
    <section className="pdx" aria-labelledby="pdx-title" data-testid="pdp-details">
      <div className="pdx-side">
        <h2 id="pdx-title" className="pdx-title">
          {title}
        </h2>
        <nav className="pdx-jump" aria-label={title}>
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={() => setOpen((o) => new Set(o).add(s.id))}>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="pdx-list">
        {sections.map((s, i) => {
          const on = open.has(s.id);
          return (
            <div key={s.id} id={s.id} className={`pdx-item ${on ? 'is-open' : ''}`} data-section={s.id}>
              <h3 className="pdx-h">
                <button
                  ref={(el) => {
                    btns.current[i] = el;
                  }}
                  type="button"
                  id={`${s.id}-btn`}
                  className="pdx-btn"
                  aria-expanded={on}
                  aria-controls={`${s.id}-panel`}
                  onClick={() => toggle(s.id)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <span className="pdx-n" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="pdx-l">{s.title}</span>
                  <span className="pdx-chev" aria-hidden="true">
                    <ChevronDownIcon size={20} />
                  </span>
                </button>
              </h3>
              <div id={`${s.id}-panel`} role="region" aria-labelledby={`${s.id}-btn`} className="pdx-panel" inert={!on}>
                <div className="pdx-clip">
                  <div className="pdx-body">{s.content}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
