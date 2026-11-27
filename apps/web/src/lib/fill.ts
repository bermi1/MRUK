/** Replaces {name} with its value; {name|one|many} picks the singular form when the value is 1 ("1 product", "3 products"). */
export function fillVars(s: string, vars: Record<string, string | number>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\|([^|}]*)\\|([^}]*)\\}`, 'g'), (_, one: string, many: string) => (Number(v) === 1 ? one : many));
    out = out.replace(`{${k}}`, String(v));
  }
  return out;
}
