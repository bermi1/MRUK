
/** Skeleton while the dashboard data streams in (slow 3G): same frame as the page, no layout shift. */
export function AccountSkeleton({ label }: { label: string }) {
  return (
    <div className="acc-skel" aria-busy="true" aria-label={label} role="status">
      <div className="wrap">
        <div className="acc-hero sk-hero">
          <div className="acc-hero-main">
            <span className="sk sk-circle" />
            <div className="acc-hero-txt">
              <span className="sk" style={{ width: 90, height: 10 }} />
              <span className="sk" style={{ width: 220, height: 26, marginTop: 10 }} />
              <span className="sk" style={{ width: 160, height: 12, marginTop: 10 }} />
            </div>
          </div>
          <div className="acc-quick">
            {[0, 1, 2].map((i) => (
              <span key={i} className="sk" style={{ height: 52 }} />
            ))}
          </div>
        </div>
        <div className="acc-tabs">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="sk" style={{ width: 86, height: 36 }} />
          ))}
        </div>
        <div className="acc-ov">
          <div className="acc-card">
            <span className="sk" style={{ width: 140, height: 18 }} />
            <span className="sk" style={{ height: 150, marginTop: 18 }} />
            <span className="sk" style={{ height: 150, marginTop: 12 }} />
          </div>
          <div className="acc-ov-side">
            {[0, 1].map((i) => (
              <div key={i} className="acc-card">
                <span className="sk" style={{ width: 110, height: 18 }} />
                <span className="sk" style={{ height: 90, marginTop: 16 }} />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
