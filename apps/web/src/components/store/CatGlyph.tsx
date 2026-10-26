/**
 * Line-art glyph per product category. Shown on category tiles and as the
 * intentional placeholder when a product photo is missing or offline.
 * Pure SVG (no network), coloured by `currentColor`.
 */
type Kind = 'fridge' | 'tv' | 'speaker' | 'kitchen' | 'generator' | 'pump' | 'washer' | 'fan' | 'ac' | 'box';

export function glyphKind(id: string, name = ''): Kind {
  const s = `${id} ${name}`.toLowerCase();
  if (/fridge|freez|refrig|combi|multi-door|single door|top mount|french/.test(s)) return 'fridge';
  if (/music-tv|televis|\btv\b/.test(s)) return 'tv';
  if (/music|speaker|sound|subwoof|boombox/.test(s)) return 'speaker';
  if (/kitchen|cook|oven|microwave|hob|kettle|blend|dispens|hood/.test(s)) return 'kitchen';
  if (/generat|engine/.test(s)) return 'generator';
  if (/agri|pump|sprayer|water/.test(s)) return 'pump';
  if (/wash|laundry|top load/.test(s)) return 'washer';
  if (/fan|cooler|purif/.test(s)) return 'fan';
  if (/\bac\b|air cond|btu|inverter|on\/off/.test(s)) return 'ac';
  return 'box';
}

const PATHS: Record<Kind, React.ReactNode> = {
  fridge: (
    <>
      <rect x="34" y="12" width="52" height="96" rx="6" />
      <path d="M34 46h52M42 24v12M42 56v20" />
      <path d="M40 108v4M80 108v4" />
    </>
  ),
  tv: (
    <>
      <rect x="10" y="22" width="100" height="62" rx="4" />
      <path d="M48 98h24M60 84v14" />
      <path d="M18 30l14 0M18 30v10" opacity=".5" />
    </>
  ),
  speaker: (
    <>
      <rect x="32" y="10" width="56" height="100" rx="8" />
      <circle cx="60" cy="74" r="20" />
      <circle cx="60" cy="74" r="7" />
      <circle cx="60" cy="32" r="9" />
    </>
  ),
  kitchen: (
    <>
      <rect x="22" y="30" width="76" height="80" rx="4" />
      <path d="M22 46h76" />
      <rect x="34" y="58" width="52" height="36" rx="3" />
      <circle cx="36" cy="38" r="3" />
      <circle cx="50" cy="38" r="3" />
      <circle cx="70" cy="38" r="3" />
      <circle cx="84" cy="38" r="3" />
      <path d="M34 22c4-6 10-6 14 0M72 22c4-6 10-6 14 0" opacity=".5" />
    </>
  ),
  generator: (
    <>
      <path d="M18 34h84v58H18z" />
      <path d="M18 34l8-12h68l8 12" />
      <rect x="30" y="48" width="34" height="30" rx="3" />
      <circle cx="84" cy="62" r="10" />
      <path d="M26 92v10M94 92v10" />
      <path d="M44 56l-4 8h8l-4 8" />
    </>
  ),
  pump: (
    <>
      <circle cx="54" cy="64" r="26" />
      <circle cx="54" cy="64" r="9" />
      <path d="M80 56h26v16H80M28 64H12M54 38V22h16" />
      <path d="M96 84c0 6-4 10-8 10s-8-4-8-10 8-14 8-14 8 8 8 14z" opacity=".6" />
    </>
  ),
  washer: (
    <>
      <rect x="22" y="12" width="76" height="98" rx="6" />
      <path d="M22 32h76" />
      <circle cx="60" cy="70" r="26" />
      <path d="M42 74c6-6 12 6 18 0s12 6 18 0" opacity=".6" />
      <circle cx="34" cy="22" r="3" />
      <path d="M70 22h18" />
    </>
  ),
  fan: (
    <>
      <rect x="44" y="10" width="32" height="88" rx="16" />
      <path d="M52 26v56M60 26v56M68 26v56" opacity=".6" />
      <path d="M40 110h40M60 98v12" />
    </>
  ),
  ac: (
    <>
      <rect x="10" y="30" width="100" height="40" rx="8" />
      <path d="M22 58h76" />
      <path d="M34 82c0 8-6 8-6 16M60 82c0 8-6 8-6 16M86 82c0 8-6 8-6 16" opacity=".6" />
    </>
  ),
  box: (
    <>
      <path d="M60 14l42 22v48L60 106 18 84V36z" />
      <path d="M18 36l42 22 42-22M60 58v48" />
    </>
  ),
};

export function CatGlyph({ kind, className, strokeWidth = 1.6 }: { kind: Kind; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[kind]}
    </svg>
  );
}
