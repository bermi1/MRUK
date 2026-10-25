/**
 * Staff password rules (shared by the server action and the live hints in the form).
 * At least 12 characters, three of four character kinds, not the seeded demo
 * password and not built from the person's email name.
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** Seeded and widely shared passwords that must never be chosen again. */
const BANNED = ['changeme-2026!', 'password1234', 'commerceos2026', 'qwerty123456', '123456789012'];

export interface PasswordCheck {
  ok: boolean;
  /** First problem, phrased for the form. */
  error?: string;
  rules: { key: string; label: string; ok: boolean }[];
}

export function checkStaffPassword(pw: string, email = ''): PasswordCheck {
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const lower = pw.toLowerCase();
  const rules = [
    { key: 'length', label: `At least ${PASSWORD_MIN} characters`, ok: pw.length >= PASSWORD_MIN && pw.length <= PASSWORD_MAX },
    { key: 'kinds', label: 'Three of: lower case, upper case, digit, symbol', ok: kinds >= 3 },
    { key: 'personal', label: 'Not the default password or your email name', ok: !BANNED.includes(lower) && !(local.length >= 3 && lower.includes(local)) && !/^(.)\1+$/.test(pw) },
  ];
  const bad = rules.find((r) => !r.ok);
  if (pw.length > PASSWORD_MAX) return { ok: false, error: `Keep it under ${PASSWORD_MAX} characters`, rules };
  return { ok: !bad, error: bad ? `Password: ${bad.label.toLowerCase()}` : undefined, rules };
}
