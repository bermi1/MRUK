/** README: draft → submitted → approved | rejected → disbursed → repaying → closed. */
export const ADVANCE_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'disbursed', 'repaying', 'closed'] as const;
export type AdvanceStatus = (typeof ADVANCE_STATUSES)[number];

const ADVANCE_TRANSITIONS: Record<AdvanceStatus, AdvanceStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['disbursed'],
  rejected: [],
  disbursed: ['repaying'],
  repaying: ['closed'],
  closed: [],
};

export function isAdvanceStatus(v: string): v is AdvanceStatus {
  return (ADVANCE_STATUSES as readonly string[]).includes(v);
}

export function canTransitionAdvance(from: AdvanceStatus, to: AdvanceStatus): boolean {
  return ADVANCE_TRANSITIONS[from].includes(to);
}

export function nextAdvanceStatuses(from: AdvanceStatus): AdvanceStatus[] {
  return [...ADVANCE_TRANSITIONS[from]];
}

export function assertAdvanceTransition(from: AdvanceStatus, to: AdvanceStatus): void {
  if (!canTransitionAdvance(from, to)) throw new Error(`Salary Advance cannot move from ${from} to ${to}`);
}

export const ADVANCE_STATUS_LABEL: Record<AdvanceStatus, string> = {
  draft: 'Draft',
  submitted: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  disbursed: 'Disbursed',
  repaying: 'Repaying',
  closed: 'Closed',
};

/** Contract number, e.g. AZB-SA-48213. */
export function contractNumber(seq: number): string {
  return `AZB-SA-${seq}`;
}

/** NIDA numbers are 20 digits, usually written 19900101-12345-00001-23. */
export function normaliseNida(input: string): string | null {
  const d = input.replace(/\D/g, '');
  if (d.length !== 20) return null;
  return `${d.slice(0, 8)}-${d.slice(8, 13)}-${d.slice(13, 18)}-${d.slice(18)}`;
}

/** The 8 key terms printed on every contract (prototype wording). */
export function contractTerms(months: number, instalmentF: string, firstDeductionF: string): string[] {
  return [
    'The Seller supplies the goods listed above at the stated cash price; the Financier settles the Seller on approval.',
    `The Customer repays the Financier in ${months} equal monthly instalments of ${instalmentF}, deducted from salary, starting ${firstDeductionF}.`,
    'Ownership of the goods passes to the Customer when all instalments are paid; the Customer may use the goods from delivery.',
    'The Customer may settle the balance early at any time without penalty.',
    'If the Customer changes employer or salary account, they must notify Azania Bank within 7 days.',
    'Any charges or fees are as set out in the Azania Bank Salary Advance terms provided at approval.',
    "The goods carry the manufacturer warranty; warranty claims are handled by the Seller's service centres.",
    'Personal data is processed only for this agreement in line with the Personal Data Protection Act, 2022.',
  ];
}

export const CONTRACT_CONSENTS = [
  'I have read and accept the terms of this agreement.',
  'I authorise my employer and Azania Bank to deduct the monthly instalment from my salary.',
] as const;

/** A typed signature must be the signer's name: at least 4 characters and share a word with it. */
export function signatureMatches(signature: string, fullName: string): boolean {
  const s = signature.trim().toLowerCase();
  if (s.length < 4) return false;
  const words = fullName.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  return words.length === 0 || words.some((w) => s.includes(w));
}
