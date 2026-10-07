'use client';

export function PrintButton({ children = 'Print / Save as PDF' }: { children?: React.ReactNode }) {
  return (
    <button type="button" className="ad-btn line" onClick={() => window.print()}>
      {children}
    </button>
  );
}
