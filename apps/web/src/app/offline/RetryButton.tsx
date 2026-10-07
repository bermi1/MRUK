'use client';

export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{ minHeight: 48, padding: '0 28px', borderRadius: 999, background: '#1D2366', color: '#fff', fontSize: 15, fontWeight: 600 }}
    >
      Try again
    </button>
  );
}
