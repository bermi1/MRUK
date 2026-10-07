/**
 * Affordability rule (MASTER_PROMPT): block an application if the monthly
 * instalment is more than one third of net salary.
 */
export const MAX_INSTALMENT_RATIO = 1 / 3;

export type AffordabilityStatus = 'unknown' | 'within' | 'above';

export interface Affordability {
  status: AffordabilityStatus;
  ratio: number;
  /** Instalment as a whole percentage of net salary. */
  percent: number;
  /** Width of the meter, 0–100, where 100 = the one-third limit. */
  meter: number;
  /** Largest instalment allowed for this salary. */
  maxInstalment: number;
}

export function assessAffordability(instalment: number, netSalary: number): Affordability {
  if (!netSalary || netSalary <= 0) {
    return { status: 'unknown', ratio: 0, percent: 0, meter: 0, maxInstalment: 0 };
  }
  const ratio = instalment / netSalary;
  const maxInstalment = Math.floor(netSalary * MAX_INSTALMENT_RATIO);
  return {
    status: instalment <= maxInstalment ? 'within' : 'above',
    ratio,
    percent: Math.round(ratio * 100),
    meter: Math.min(100, Math.round((ratio / MAX_INSTALMENT_RATIO) * 100)),
    maxInstalment,
  };
}

export function isAffordable(instalment: number, netSalary: number): boolean {
  return assessAffordability(instalment, netSalary).status === 'within';
}

/** Shortest term (from the allowed list) whose instalment fits the salary, or null. */
export function shortestAffordableTerm(total: number, netSalary: number, terms: readonly number[] = [3, 6, 12]): number | null {
  for (const t of [...terms].sort((a, b) => a - b)) {
    if (isAffordable(Math.round(total / t), netSalary)) return t;
  }
  return null;
}
