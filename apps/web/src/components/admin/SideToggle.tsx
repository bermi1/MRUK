'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Phone / small tablet: the sidebar collapses to its header row with a Menu button
 * (otherwise every page starts with a full screen of navigation). Closes on navigation.
 */
export function SideToggle() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.querySelector('.ad-side')?.toggleAttribute('data-open', open);
  }, [open]);
  return (
    <button type="button" className="ad-menu" aria-expanded={open} aria-controls="ad-sidenav" onClick={() => setOpen((v) => !v)}>
      {open ? 'Close' : 'Menu'}
    </button>
  );
}
