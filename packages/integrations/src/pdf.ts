import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { fmtDate, fmtTZS } from '@bt/core';

/** Standard PDF fonts are WinAnsi only: replace characters they can't encode. */
function safe(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•·]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

const INK = rgb(0.07, 0.08, 0.17);
const MUTED = rgb(0.37, 0.39, 0.47);
const BLUE = rgb(0, 0.47, 0.71);
const LINE = rgb(0.88, 0.89, 0.92);

class Writer {
  y: number;
  page: PDFPage;
  constructor(
    private doc: PDFDocument,
    public font: PDFFont,
    public bold: PDFFont,
    public mono: PDFFont,
  ) {
    this.page = doc.addPage([595, 842]);
    this.y = 800;
  }
  ensure(h: number) {
    if (this.y - h < 50) {
      this.page = this.doc.addPage([595, 842]);
      this.y = 800;
    }
  }
  text(s: string, x: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; y?: number } = {}) {
    this.page.drawText(safe(s), { x, y: opts.y ?? this.y, size: opts.size ?? 10, font: opts.font ?? this.font, color: opts.color ?? INK });
  }
  right(s: string, xRight: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) {
    const f = opts.font ?? this.font;
    const size = opts.size ?? 10;
    this.text(s, xRight - f.widthOfTextAtSize(safe(s), size), opts);
  }
  /** Word-wrapped paragraph; returns height used. */
  para(s: string, x: number, width: number, size = 9.5, font = this.font, color = INK, lead = 1.45) {
    const words = safe(s).split(/\s+/);
    let line = '';
    const lines: string[] = [];
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      this.ensure(size * lead);
      this.page.drawText(l, { x, y: this.y, size, font, color });
      this.y -= size * lead;
    }
  }
  rule(color = LINE, thickness = 1) {
    this.page.drawLine({ start: { x: 50, y: this.y }, end: { x: 545, y: this.y }, thickness, color });
  }
}

async function img(doc: PDFDocument, png?: Uint8Array): Promise<PDFImage | null> {
  if (!png) return null;
  try {
    return await doc.embedPng(png);
  } catch {
    return null;
  }
}

export interface ContractPdfInput {
  number: string;
  signedAt: Date;
  seller: { legal: string; logoPng?: Uint8Array };
  azaniaLogoPng?: Uint8Array;
  customer: { name: string; nida: string; jobTitle: string; employer: string; checkNumber: string; account: string; phone: string };
  orderNumber: string;
  items: { name: string; model: string; qty: number; price: number }[];
  total: number;
  months: number;
  monthly: number;
  firstDeduction: Date;
  schedule: { n: number; dueDate: Date; amount: number }[];
  terms: string[];
  signature: string;
  consents: { text: string; acceptedAt: string }[];
  signerIp?: string;
}

/** Instalment Sale and Salary Advance Agreement (layout follows the Brand Store prototype). */
export async function contractPdf(c: ContractPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${c.number} Instalment Sale and Salary Advance Agreement`);
  doc.setAuthor(c.seller.legal);
  doc.setCreationDate(c.signedAt);
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold), await doc.embedFont(StandardFonts.Courier));

  const sl = await img(doc, c.seller.logoPng);
  const al = await img(doc, c.azaniaLogoPng);
  if (sl) {
    const s = sl.scaleToFit(110, 40);
    w.page.drawImage(sl, { x: 50, y: w.y - s.height + 14, width: s.width, height: s.height });
  }
  if (al) {
    const s = al.scaleToFit(60, 46);
    w.page.drawImage(al, { x: 545 - s.width, y: w.y - s.height + 14, width: s.width, height: s.height });
  }
  w.text('Instalment Sale and Salary Advance Agreement', 170, { size: 13, font: w.bold });
  w.y -= 16;
  w.text(`${c.number} - ${fmtDate(c.signedAt)} - Order ${c.orderNumber}`, 200, { size: 9, font: w.mono, color: MUTED });
  w.y -= 22;
  w.rule(INK, 1.5);
  w.y -= 20;

  const col = (x: number, label: string, lines: string[]) => {
    let y = w.y;
    w.text(label, x, { size: 7.5, font: w.mono, color: MUTED, y });
    y -= 13;
    lines.forEach((l, i) => {
      w.text(l, x, { size: i === 0 ? 10 : 8.5, font: i === 0 ? w.bold : w.font, color: i === 0 ? INK : MUTED, y });
      y -= 12;
    });
    return y;
  };
  const y1 = col(50, 'SELLER', [c.seller.legal, 'Dar es Salaam, Tanzania']);
  const y2 = col(215, 'FINANCIER', ['Azania Bank Limited', 'Salary Advance Scheme']);
  const y3 = col(380, 'CUSTOMER', [c.customer.name, `NIDA ${c.customer.nida}`, `${c.customer.jobTitle}, ${c.customer.employer}`, `Check no. ${c.customer.checkNumber}`, `Account ${c.customer.account} - ${c.customer.phone}`]);
  w.y = Math.min(y1, y2, y3) - 10;

  // Goods table
  w.text('Goods', 50, { size: 8.5, color: MUTED });
  w.text('Model', 290, { size: 8.5, color: MUTED });
  w.text('Qty', 430, { size: 8.5, color: MUTED });
  w.right('Cash price', 545, { size: 8.5, color: MUTED });
  w.y -= 6;
  w.rule();
  for (const it of c.items) {
    w.y -= 15;
    w.text(it.name, 50, { size: 9.5 });
    w.text(it.model, 290, { size: 8.5, font: w.mono });
    w.text(String(it.qty), 434, { size: 9.5 });
    w.right(fmtTZS(it.price * it.qty), 545, { size: 9.5 });
    w.y -= 6;
    w.rule();
  }
  w.y -= 26;

  // Summary boxes
  const boxes: [string, string, boolean][] = [
    ['Total cash price', fmtTZS(c.total), false],
    ['Term', `${c.months} months`, false],
    ['Monthly instalment', fmtTZS(c.monthly), true],
    ['First deduction', fmtDate(c.firstDeduction), false],
  ];
  boxes.forEach(([l, v, hi], i) => {
    const x = 50 + i * 125;
    w.page.drawRectangle({ x, y: w.y - 14, width: 118, height: 40, color: hi ? rgb(0.92, 0.96, 0.99) : rgb(0.96, 0.96, 0.97) });
    w.text(l, x + 8, { size: 7.5, color: hi ? BLUE : MUTED, y: w.y + 12 });
    w.text(v, x + 8, { size: 10.5, font: w.bold, color: hi ? BLUE : INK, y: w.y - 3 });
  });
  w.y -= 40;

  w.text('Repayment schedule', 50, { size: 10.5, font: w.bold });
  w.y -= 16;
  const perCol = Math.ceil(c.schedule.length / 3);
  const top = w.y;
  c.schedule.forEach((s, i) => {
    const x = 50 + Math.floor(i / perCol) * 168;
    const y = top - (i % perCol) * 14;
    w.text(`${s.n}. ${fmtDate(s.dueDate)}`, x, { size: 8.5, color: MUTED, y });
    w.page.drawText(safe(fmtTZS(s.amount)), { x: x + 150 - w.bold.widthOfTextAtSize(safe(fmtTZS(s.amount)), 8.5), y, size: 8.5, font: w.bold, color: INK });
  });
  w.y = top - perCol * 14 - 14;

  w.ensure(60);
  w.text('Key terms', 50, { size: 10.5, font: w.bold });
  w.y -= 15;
  c.terms.forEach((t, i) => {
    w.ensure(14);
    w.text(`${i + 1}.`, 50, { size: 9 });
    w.para(t, 64, 480, 9);
    w.y -= 2;
  });

  w.ensure(150);
  w.y -= 10;
  w.rule();
  w.y -= 18;
  w.text('Consents', 50, { size: 10.5, font: w.bold });
  w.y -= 15;
  for (const k of c.consents) {
    w.text('[x]', 50, { size: 9, font: w.mono });
    w.para(`${k.text} (accepted ${k.acceptedAt.replace('T', ' ').slice(0, 16)} UTC)`, 72, 470, 9);
    w.y -= 2;
  }
  w.y -= 26;
  w.text(c.signature, 50, { size: 24, font: await doc.embedFont(StandardFonts.TimesRomanItalic), color: rgb(0.11, 0.14, 0.4) });
  w.y -= 8;
  w.page.drawLine({ start: { x: 50, y: w.y }, end: { x: 330, y: w.y }, thickness: 1.2, color: INK });
  w.y -= 12;
  w.text(`Customer e-signature (typed) - ${c.signedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC${c.signerIp ? ` - IP ${c.signerIp}` : ''}`, 50, { size: 8, color: MUTED });
  w.y -= 12;
  w.text('Signed electronically. Final approval and terms are set by Azania Bank.', 50, { size: 8, color: MUTED });

  return doc.save();
}

export interface InvoicePdfInput {
  number: string;
  issuedAt: Date;
  status: string;
  seller: { legal: string; logoPng?: Uint8Array; email: string };
  orderNumber: string;
  customer: { name: string; phone: string; region: string };
  items: { name: string; model: string; qty: number; price: number }[];
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
}

/** Tax invoice. Prices are VAT inclusive (18%). EFD/VFD receipt integration is out of scope this phase. */
export async function invoicePdf(v: InvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${v.number} Invoice`);
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold), await doc.embedFont(StandardFonts.Courier));
  const sl = await img(doc, v.seller.logoPng);
  if (sl) {
    const s = sl.scaleToFit(120, 44);
    w.page.drawImage(sl, { x: 50, y: w.y - s.height + 14, width: s.width, height: s.height });
  }
  w.right('TAX INVOICE', 545, { size: 16, font: w.bold });
  w.y -= 18;
  w.right(v.number, 545, { size: 10, font: w.mono, color: MUTED });
  w.y -= 13;
  w.right(`Issued ${fmtDate(v.issuedAt)} - ${v.status.toUpperCase()}`, 545, { size: 9, color: MUTED });
  w.y -= 34;
  w.text('BILLED TO', 50, { size: 7.5, font: w.mono, color: MUTED });
  w.text('FROM', 330, { size: 7.5, font: w.mono, color: MUTED });
  w.y -= 13;
  w.text(v.customer.name, 50, { size: 10.5, font: w.bold });
  w.text(v.seller.legal, 330, { size: 10.5, font: w.bold });
  w.y -= 13;
  w.text(`${v.customer.phone} - ${v.customer.region}`, 50, { size: 9, color: MUTED });
  w.text(v.seller.email, 330, { size: 9, color: MUTED });
  w.y -= 13;
  w.text(`Order ${v.orderNumber} - ${v.paymentMethod}`, 50, { size: 9, color: MUTED });
  w.y -= 28;
  w.text('Item', 50, { size: 8.5, color: MUTED });
  w.text('Model', 280, { size: 8.5, color: MUTED });
  w.text('Qty', 410, { size: 8.5, color: MUTED });
  w.right('Amount', 545, { size: 8.5, color: MUTED });
  w.y -= 6;
  w.rule();
  for (const it of v.items) {
    w.y -= 15;
    w.text(it.name, 50, { size: 9.5 });
    w.text(it.model, 280, { size: 8.5, font: w.mono });
    w.text(String(it.qty), 414, { size: 9.5 });
    w.right(fmtTZS(it.price * it.qty), 545, { size: 9.5 });
    w.y -= 6;
    w.rule();
  }
  const net = Math.round(v.total / 1.18);
  const rows: [string, string, boolean][] = [
    ['Delivery', v.deliveryFee ? fmtTZS(v.deliveryFee) : 'Free', false],
    ...(v.discount ? ([['Discount', `-${fmtTZS(v.discount)}`, false]] as [string, string, boolean][]) : []),
    ['Net of VAT', fmtTZS(net), false],
    ['VAT 18%', fmtTZS(v.total - net), false],
    ['Total (VAT inclusive)', fmtTZS(v.total), true],
  ];
  w.y -= 8;
  for (const [l, val, b] of rows) {
    w.y -= 16;
    w.text(l, 340, { size: b ? 11 : 9.5, font: b ? w.bold : w.font, color: b ? INK : MUTED });
    w.right(val, 545, { size: b ? 11 : 9.5, font: b ? w.bold : w.font });
  }
  w.y -= 40;
  w.para('Thank you for shopping with us. Products carry a 2-year manufacturer warranty. EFD receipt is issued separately by the fiscal device.', 50, 495, 8.5, w.font, MUTED);
  return doc.save();
}
