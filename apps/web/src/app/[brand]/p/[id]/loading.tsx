/** Designed placeholder while a product page streams in. */
export default function Loading() {
  return (
    <div className="wrap skel-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="pdp">
        <div className="skel skel-media" />
        <div>
          <div className="skel skel-line short" />
          <div className="skel skel-title" />
          <div className="skel skel-line" />
          <div className="skel skel-box" />
          <div className="skel skel-box" />
        </div>
      </div>
    </div>
  );
}
