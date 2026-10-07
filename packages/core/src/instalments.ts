/** Salary Advance terms offered in this phase (README: 3/6/12 months). */
export const ADVANCE_TERMS = [3, 6, 12] as const;
export type AdvanceTerm = (typeof ADVANCE_TERMS)[number];

/** Day of month on which salary deductions happen (prototype default). */
export const DEDUCTION_DAY = 25;

export function isAdvanceTerm(n: number): n is AdvanceTerm {
  return (ADVANCE_TERMS as readonly number[]).includes(n);
}

/** Equal monthly instalment, rounded to whole shillings. The last instalment absorbs rounding. */
export function monthlyInstalment(total: number, months: number): number {
  if (months <= 0) throw new Error('months must be positive');
  return Math.round(total / months);
}

/** First deduction is the deduction day of the month after signing. */
export function firstDeductionDate(signedAt: Date): Date {
  return new Date(Date.UTC(signedAt.getUTCFullYear(), signedAt.getUTCMonth() + 1, DEDUCTION_DAY));
}

export interface Instalment {
  n: number;
  dueDate: Date;
  amount: number;
}

/** Full repayment schedule. Amounts always sum exactly to `total`. */
export function buildSchedule(total: number, months: number, signedAt: Date): Instalment[] {
  const inst = monthlyInstalment(total, months);
  const first = firstDeductionDate(signedAt);
  return Array.from({ length: months }, (_, i) => ({
    n: i + 1,
    dueDate: new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, DEDUCTION_DAY)),
    amount: i === months - 1 ? total - inst * (months - 1) : inst,
  }));
}

/** dd Mon yyyy, e.g. "25 Nov 2026". */
export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Dar_es_Salaam' });
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' });
}

export interface RepaymentProgress {
  paid: number;
  remaining: number;
  percent: number;
  nextDue: Instalment | null;
}

export function repaymentProgress(schedule: (Instalment & { paid?: boolean })[]): RepaymentProgress {
  const total = schedule.reduce((a, s) => a + s.amount, 0);
  const paid = schedule.filter((s) => s.paid).reduce((a, s) => a + s.amount, 0);
  return {
    paid,
    remaining: total - paid,
    percent: total ? Math.round((paid / total) * 100) : 0,
    nextDue: schedule.find((s) => !s.paid) ?? null,
  };
}
