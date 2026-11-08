/**
 * Product-page facts derived only from what staff entered (features, specs).
 * Nothing here invents data: a fact is shown only when a feature string states it.
 */

export type FactKind = 'capacity' | 'power' | 'cooling' | 'size' | 'timer' | 'water' | 'temperature' | 'feature';

// Order matters: the first match wins ("138L (93L fridge, 45L freezer)" is a capacity, not cooling).
const RULES: { kind: Exclude<FactKind, 'feature'>; re: RegExp }[] = [
  { kind: 'capacity', re: /\b\d+(?:\.\d+)?\s?(?:l|litres?|liters?|kg)\b|\bcapacity\b/i },
  { kind: 'cooling', re: /\b\d[\d,.]*\s?btu\b|\binverter\b|\bno-?frost\b|\bfreez/i },
  { kind: 'power', re: /\b\d+(?:\.\d+)?\s?(?:hp|kw|kva|w|watts?|v|volts?)\b|\bstroke\b|\bstarter\b|\bengine\b/i },
  // Screen/fan sizes and dimensions; not bare metres ("3m copper pipes" is an accessory, not the size).
  { kind: 'size', re: /\b\d+(?:\.\d+)?\s?(?:inch(?:es)?|cm|mm)\b|\d+\s?"|\bslim\b|\bcompact\b/i },
  { kind: 'timer', re: /\btimer\b|\bhours?\b|\bhrs?\b/i },
  { kind: 'water', re: /\bwater\b|\bpump\b|\bdispens|\bflow\b|\bdrain\b/i },
  { kind: 'temperature', re: /\btemperature\b|\bthermostat\b|\bheat/i },
];

/** Which icon/label family a feature belongs to ('feature' when nothing matches). */
export function factKind(feature: string): FactKind {
  return RULES.find((r) => r.re.test(feature))?.kind ?? 'feature';
}

/** Spec-table facts that can be read off the features: first feature per kind, measurable kinds only. */
export function featureFacts(features: readonly string[]): { kind: 'capacity' | 'power' | 'cooling' | 'size'; value: string }[] {
  const out: { kind: 'capacity' | 'power' | 'cooling' | 'size'; value: string }[] = [];
  for (const f of features) {
    const value = f.trim();
    if (!value) continue;
    const kind = factKind(value);
    if ((kind === 'capacity' || kind === 'power' || kind === 'cooling' || kind === 'size') && /\d/.test(value) && !out.some((o) => o.kind === kind)) out.push({ kind, value });
  }
  return out;
}

/** Up to `max` non-empty, de-duplicated features for the highlights row. */
export function highlights(features: readonly string[], max = 4): { kind: FactKind; text: string }[] {
  const seen = new Set<string>();
  const out: { kind: FactKind; text: string }[] = [];
  for (const f of features) {
    const text = f.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: factKind(text), text });
    if (out.length >= max) break;
  }
  return out;
}

/** Staff specs with blank rows removed (the admin form keeps empty suggestion rows). */
export function cleanSpecs(specs: readonly { label?: unknown; value?: unknown }[] | null | undefined): { label: string; value: string }[] {
  if (!Array.isArray(specs)) return [];
  return specs
    .map((s) => ({ label: typeof s?.label === 'string' ? s.label.trim() : '', value: typeof s?.value === 'string' ? s.value.trim() : '' }))
    .filter((s) => s.label && s.value);
}
