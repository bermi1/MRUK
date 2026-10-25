/** Designed placeholder while a category streams in (shimmer respects reduced motion). */
export default function Loading() {
  return (
    <div className="wrap skel-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skel skel-hero" />
      <div className="skel-row">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skel skel-chip" />
        ))}
      </div>
      <div className="grid-5" style={{ marginTop: 20 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="skel-card">
            <div className="skel skel-img" />
            <div className="skel skel-line" />
            <div className="skel skel-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
