type P = { size?: number; color?: string; className?: string };

export const SearchIcon = ({ size = 16, color = '#8A8EA3' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const UserIcon = ({ size = 16, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const CompareIcon = ({ size = 16, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden="true"><path d="M4 7h10M4 17h16M14 3l4 4-4 4" /></svg>
);
export const BagIcon = ({ size = 17, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden="true"><path d="M5 7h14l-1.5 12h-11z" /><path d="M9 7a3 3 0 016 0" /></svg>
);
export const ShareIcon = ({ size = 15, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" /></svg>
);
export const CheckIcon = ({ size = 34, color = '#16825D' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const LocateIcon = ({ size = 15, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
);
export const HomeIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" /></svg>
);
export const GridIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>
);
export const TagIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden="true"><path d="M3 12V4a1 1 0 011-1h8l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></svg>
);
export const WhatsAppIcon = ({ size = 28, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.2-1.2c-.1-.1-.3-.2-.5-.3z" /></svg>
);
export const BackIcon = ({ size = 18, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);

/* Stroke icons (currentColor, aria-hidden). Used in place of emoji and pictographic characters. */
type S = { size?: number; className?: string; strokeWidth?: number };
const Svg = ({ size = 18, className, strokeWidth = 1.8, children }: S & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
    {children}
  </svg>
);
export const TickIcon = (p: S) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const CloseIcon = (p: S) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const PlusIcon = (p: S) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p: S) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const ArrowRightIcon = (p: S) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const ChevronLeftIcon = (p: S) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const ChevronRightIcon = (p: S) => <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>;
export const PlayIcon = (p: S) => <Svg {...p}><path d="M7 4.5v15l12-7.5z" /></Svg>;
export const PauseIcon = (p: S) => <Svg {...p}><path d="M8 5v14M16 5v14" /></Svg>;
export const SparkleIcon = (p: S) => <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" /></Svg>;
export const BoltIcon = (p: S) => <Svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></Svg>;
export const CopyIcon = (p: S) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></Svg>;
export const BackspaceIcon = (p: S) => <Svg {...p}><path d="M21 5H9l-6 7 6 7h12a1 1 0 001-1V6a1 1 0 00-1-1zM12 9l6 6M18 9l-6 6" /></Svg>;
export const TruckIcon = (p: S) => <Svg {...p}><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></Svg>;
export const ShieldIcon = (p: S) => <Svg {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" /></Svg>;
export const CardIcon = (p: S) => <Svg {...p}><path d="M3 6h18v12H3zM3 10h18M7 15h4" /></Svg>;
export const PinIcon = (p: S) => <Svg {...p}><path d="M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></Svg>;
export const ClockIcon = (p: S) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const ChatIcon = (p: S) => <Svg {...p}><path d="M4 5h16v11H9l-5 4z" /></Svg>;
export const GlobeIcon = (p: S) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" /></Svg>;
export const HelpIcon = (p: S) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2.5M12 17h.01" /></Svg>;
export const SetIcon = (p: S) => <Svg {...p}><rect x="3" y="8" width="8" height="12" rx="1" /><rect x="13" y="4" width="8" height="16" rx="1" /></Svg>;
export const RouteIcon = (p: S) => <Svg {...p}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7a3 3 0 000-6H9a3 3 0 010-6h7" /></Svg>;
export const SlidersIcon = (p: S) => <Svg {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Svg>;
export const DotIcon = ({ size = 8, className }: S) => (
  <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true" focusable="false" className={className}><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
);

const STAR = 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z';
/** One star; `fill` 0..1 for a partial fill (a clipped overlay, so no SVG ids are needed). */
function Star({ size, fill }: { size: number; fill: number }) {
  return (
    <span className="star" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={STAR} /></svg>
      {fill > 0 && (
        <span className="star-fill" style={{ width: `${Math.round(fill * 100)}%` }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={STAR} /></svg>
        </span>
      )}
    </span>
  );
}
/** Star rating with partial fill, announced as "Rated 4.7 out of 5" (override with `label`). */
export function Stars({ value, size = 14, className, label }: { value: number; size?: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(5, value));
  const text = label ?? `Rated ${Number.isInteger(v) ? v : v.toFixed(1)} out of 5`;
  return (
    <span className={`stars ${className ?? ''}`} role="img" aria-label={text}>
      {[0, 1, 2, 3, 4].map((k) => (
        <Star key={k} size={size} fill={Math.max(0, Math.min(1, v - k))} />
      ))}
    </span>
  );
}

/** Social profile glyphs (simple outline marks, currentColor). */
const SOCIAL_PATHS: Record<string, React.ReactNode> = {
  facebook: <path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </>
  ),
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.4 2.6 2.2 4.3 5 4.5" />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" />
    </>
  ),
  x: <path d="M4 4l16 16M20 4L4 20" />,
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5V16M8 7.8v.2M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1.9 2.1 2.6V16" />
    </>
  ),
};
export const SocialIcon = ({ name, size = 18 }: { name: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {SOCIAL_PATHS[name]}
  </svg>
);
