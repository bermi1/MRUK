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
