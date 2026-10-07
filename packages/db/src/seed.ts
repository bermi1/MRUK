/**
 * Seed the database from the design handoff (handoff/design/brand-data.js),
 * plus staff roles, demo orders, Salary Advance applications and tickets so
 * every admin screen has realistic data. Safe to re-run: it clears and reloads.
 *
 *   pnpm db:seed
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  ADVANCE_TERMS,
  buildSchedule,
  deliveryFee,
  monthlyInstalment,
  normaliseNida,
  orderNumber,
  REGIONS,
  type AdvanceStatus,
  type OrderStatus,
  type PaymentMethod,
} from '@bt/core';
import { encrypt, hashPassword, prisma, sha256 } from './index';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

interface RawProduct {
  id: string;
  brand: string;
  cat: string;
  sub: string;
  model: string;
  name: string;
  price: number;
  stock: number;
  features: string[];
  img: string;
  tag: string;
}

/** Evaluate the prototype's brand-data.js in a sandbox and read its catalogue. */
function loadHandoff() {
  const src = readFileSync(resolve(root, 'handoff/design/brand-data.js'), 'utf8');
  const store: Record<string, string> = {};
  const sandbox: Record<string, unknown> = {
    localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    CustomEvent: class {},
  };
  sandbox.window = sandbox;
  vm.runInNewContext(src, sandbox);
  const BT = sandbox.BT as {
    BRANDS: Record<string, Record<string, string>>;
    CATS: Record<string, { id: string; name: string; short: string; img: string; subs: string[] }[]>;
    SUPPLIERS: { city: string; area: string; type: string; phone: string; hours: string; lat: number; lng: number; brands: string[] }[];
    cms: (b: string) => Record<string, unknown>;
    productsAll: (b: string) => RawProduct[];
  };
  return BT;
}

/** Local copies of the three product photos shipped with the design. */
const LOCAL_IMAGES: Record<string, string> = {
  'mruk-uk-f275-58-5di0wd': '/img/products/mruk-french-fridge.webp',
  'mruk-uk-g3500q': '/img/products/mruk-g3500q-generator.webp',
  'skywood-sk6031ges': '/img/products/skywood-sk6031ges-cooker.webp',
};

const BRAND_LOGO = { mruk: '/brand/mruk.png', skywood: '/brand/skywood.png' } as const;

// Deterministic pseudo-random numbers so the demo data is stable between runs.
let seed = 20261007;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]!;

const CUSTOMERS = [
  ['Neema Mushi', '+255754000214', 'Dar es Salaam', 'University of Dar es Salaam', 'Lecturer', 1_800_000],
  ['John Kimaro', '+255713441902', 'Arusha', 'Arusha City Council', 'Engineer', 1_400_000],
  ['Asha Said', '+255777210554', 'Zanzibar', 'Zanzibar Revenue Board', 'Revenue officer', 1_600_000],
  ['Peter Lyimo', '+255684330118', 'Mwanza', 'Bugando Hospital', 'Clinical officer', 1_300_000],
  ['Fatma Ali', '+255765902331', 'Dar es Salaam', 'TANESCO', 'Accountant', 1_700_000],
  ['David Mrema', '+255755118700', 'Dodoma', 'Dodoma City Council', 'Planner', 1_250_000],
  ['Grace Mollel', '+255712600481', 'Arusha', 'NHIF', 'Officer', 1_350_000],
  ['Hamisi Juma', '+255786021993', 'Mbeya', 'TPA', 'Supervisor', 1_150_000],
  ['Rehema Nyerere', '+255744512090', 'Dodoma', 'Ministry of Health', 'Nurse', 1_200_000],
  ['Joseph Mtui', '+255715900321', 'Dar es Salaam', 'TANESCO', 'Technician', 1_100_000],
  ['Upendo Massawe', '+255769220145', 'Arusha', 'NHIF', 'Claims officer', 1_050_000],
  ['Baraka Temba', '+255622781004', 'Dar es Salaam', 'TPA', 'Pilot', 2_600_000],
  ['Mariam Kessy', '+255658113402', 'Dar es Salaam', 'Muhimbili Hospital', 'Doctor', 3_100_000],
  ['Elia Swai', '+255743550019', 'Mwanza', 'TRA', 'Auditor', 1_900_000],
] as const;

async function main() {
  const BT = loadHandoff();
  console.log('Clearing existing data…');
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.instalmentSchedule.deleteMany(),
    prisma.salaryAdvanceApplication.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderEvent.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.session.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.address.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.productEmbedding.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.cmsBlock.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.discountCode.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.staffUser.deleteMany(),
    prisma.role.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.counter.deleteMany(),
  ]);

  // Brands, categories, products -------------------------------------------
  const products: RawProduct[] = [];
  for (const key of ['mruk', 'skywood'] as const) {
    const b = BT.BRANDS[key]!;
    await prisma.brand.create({
      data: {
        key,
        name: b.name!,
        legal: b.legal!,
        domain: b.domain!,
        tagline: b.tagline!,
        whatsapp: b.whatsapp!,
        supportEmail: b.supportEmail!,
        heroImg: b.heroImg ?? '',
        tokens: { primary: b.primary, dark: b.dark, soft: b.soft, ink: b.ink, accent: b.accent, hi: b.hi, r: b.r, rs: b.rs, head: b.head, track: b.track, logo: BRAND_LOGO[key] },
      },
    });
    const cats = BT.CATS[key]!;
    for (const [i, c] of cats.entries()) {
      await prisma.category.create({ data: { id: `${key}-${c.id}`, brandKey: key, slug: c.id, name: c.name, short: c.short, img: c.img, subs: c.subs, sort: i } });
    }
    const list = BT.productsAll(key);
    for (const [i, p] of list.entries()) {
      products.push(p);
      const images = LOCAL_IMAGES[p.id] ? [LOCAL_IMAGES[p.id]!] : p.img ? [p.img] : [];
      await prisma.product.create({
        data: {
          id: p.id,
          brandKey: key,
          categoryId: `${key}-${p.cat}`,
          sub: p.sub,
          model: p.model,
          name: p.name,
          price: p.price,
          stock: p.stock,
          features: p.features,
          images,
          tag: p.tag,
          rating: Math.round((4.5 + rnd() * 0.45) * 10) / 10,
          reviews: 20 + Math.floor(rnd() * 300),
          // Later items in the handoff list are "new this season" (prototype reverses the list).
          createdAt: new Date(Date.now() - (list.length - i) * 86_400_000),
          embedding: { create: { text: [p.model, p.name, p.sub, ...p.features].join(' | ') } },
        },
      });
    }
    // CMS blocks
    const cms = BT.cms(key);
    for (const k of ['announcement', 'hero', 'megaPromo', 'deals', 'seo'] as const) {
      await prisma.cmsBlock.create({ data: { brandKey: key, key: k, json: cms[k] as object } });
    }
    await prisma.cmsBlock.create({ data: { brandKey: key, key: 'hot', json: [] } });
  }
  console.log(`  ${products.length} products in 2 brands`);

  for (const s of BT.SUPPLIERS) await prisma.supplier.create({ data: s });

  // Promotions: flash deals and discount codes ------------------------------
  const flashPicks: [string, string, number][] = [
    ['mruk', 'mruk-uk-f215-30-4dl-wd', 15],
    ['mruk', 'mruk-uk-g5500q', 10],
    ['mruk', 'mruk-uk-55-smart', 12],
    ['mruk', 'mruk-uk-90wm', 8],
    ['skywood', 'skywood-sky-50-5bi', 15],
    ['skywood', 'skywood-csdc-18k', 10],
    ['skywood', 'skywood-sky-em19a01', 12],
    ['skywood', 'skywood-q9', 8],
  ];
  for (const [brandKey, productId, percent] of flashPicks) {
    await prisma.promotion.create({ data: { brandKey, kind: 'flash', productId, percent, title: 'Flash deal', active: true } });
  }
  const yearEnd = new Date(Date.UTC(new Date().getUTCFullYear(), 11, 31, 20, 59));
  await prisma.discountCode.createMany({
    data: [
      { code: 'SALARY12', percent: 0, brandKey: null, active: true, expiresAt: yearEnd, uses: 214 },
      { code: 'KITCHEN10', percent: 10, brandKey: 'skywood', active: true, expiresAt: yearEnd, minSubtotal: 200_000, uses: 96 },
      { code: 'POWER15', percent: 15, brandKey: 'mruk', active: true, expiresAt: yearEnd, minSubtotal: 500_000, uses: 58 },
      { code: 'WELCOME5', percent: 5, brandKey: null, active: false, uses: 412 },
      { code: 'KARIBU10', percent: 10, brandKey: null, active: true, expiresAt: yearEnd, uses: 0 },
    ],
  });

  // Staff, roles ------------------------------------------------------------
  const PERMS = {
    owner: ['*'],
    manager: ['dashboard', 'orders', 'orders.write', 'advance', 'invoices', 'customers', 'products', 'products.write', 'inventory', 'catalog', 'promos', 'promos.write', 'cms', 'cms.write', 'tickets', 'tickets.write', 'reports'],
    finance: ['dashboard', 'orders', 'advance', 'advance.write', 'invoices', 'invoices.write', 'customers', 'reports'],
    catalogue: ['dashboard', 'products', 'products.write', 'inventory', 'catalog', 'cms', 'cms.write', 'promos', 'promos.write'],
    warehouse: ['dashboard', 'orders', 'orders.write', 'inventory'],
    support: ['dashboard', 'orders', 'customers', 'tickets', 'tickets.write'],
  } as const;
  const ROLE_NAMES = { owner: 'Super admin', manager: 'Store manager', finance: 'Finance', catalogue: 'Catalogue editor', warehouse: 'Warehouse', support: 'Support agent' } as const;
  for (const [id, permissions] of Object.entries(PERMS)) {
    await prisma.role.create({ data: { id, name: ROLE_NAMES[id as keyof typeof ROLE_NAMES], permissions: [...permissions] } });
  }
  const staffPassword = process.env.SEED_STAFF_PASSWORD || 'ChangeMe-2026!';
  const staff = [
    ['Bernard Salia', 'bernard@bermitechs.com', 'owner', ['*']],
    ['Amani Kweka', 'amani@mruk.co.tz', 'manager', ['*']],
    ['Halima Juma', 'halima@skywood.co.tz', 'catalogue', ['skywood']],
    ['Daudi Mrisho', 'daudi@mruk.co.tz', 'warehouse', ['mruk']],
    ['Zawadi Nnko', 'zawadi@mruk.co.tz', 'support', ['*']],
    ['Salma Hassan', 'finance@mruk.co.tz', 'finance', ['*']],
  ] as const;
  for (const [name, email, roleId, brands] of staff) {
    await prisma.staffUser.create({ data: { name, email, roleId, brands: [...brands], passwordHash: hashPassword(staffPassword) } });
  }

  // Customers and demo orders ------------------------------------------------
  const byId = new Map(products.map((p) => [p.id, p]));
  const visible = products.filter((p) => p.stock > 0);
  const counters = { mruk: 10_420, skywood: 20_330, invoice: 1_400, contract: 88_090, ticket: 4_100 };
  const customers = [];
  for (const [name, phone, region] of CUSTOMERS) {
    customers.push(await prisma.customer.create({ data: { name, phone, locale: 'en', consentAt: new Date(), addresses: { create: { region, line: `${region} — demo address`, isDefault: true } } } }));
  }

  const methodsWeighted: PaymentMethod[] = ['salary_advance', 'salary_advance', 'salary_advance', 'salary_advance', 'salary_advance', 'azania_account', 'azania_account', 'card', 'card', 'pay_on_delivery'];
  const now = Date.now();
  let made = 0;
  for (let day = 29; day >= 0; day--) {
    const perDay = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < perDay; k++) {
      const ci = Math.floor(rnd() * CUSTOMERS.length);
      const [name, phone, region, employer, title, salary] = CUSTOMERS[ci]!;
      const brandKey = rnd() < 0.62 ? 'mruk' : 'skywood';
      const pool = visible.filter((p) => p.brand === brandKey);
      const items = [pick(pool)];
      if (rnd() < 0.2) items.push(pick(pool));
      let method = pick(methodsWeighted);
      if (method === 'pay_on_delivery' && region !== 'Dar es Salaam') method = 'card';
      const subtotal = items.reduce((a, p) => a + p.price, 0);
      const delivery = deliveryFee(region, subtotal);
      const total = subtotal + delivery;
      const createdAt = new Date(now - day * 86_400_000 - Math.floor(rnd() * 10) * 3_600_000);
      // Older orders are further along the pipeline.
      const progress: OrderStatus[] = day > 6 ? ['delivered'] : day > 3 ? ['delivered', 'out_for_delivery', 'packed'] : day > 1 ? ['approved', 'packed', 'out_for_delivery'] : method === 'salary_advance' ? ['bank_review'] : ['approved', 'placed'];
      let status = pick(progress);
      if (method !== 'salary_advance' && status === 'bank_review') status = 'approved';
      if (method === 'salary_advance' && day <= 1) status = 'bank_review';
      if (rnd() < 0.04 && day > 2) status = method === 'salary_advance' ? 'rejected' : 'cancelled';
      const seq = brandKey === 'mruk' ? counters.mruk++ : counters.skywood++;
      const months = method === 'salary_advance' ? pick(ADVANCE_TERMS) : null;
      const channel = method === 'salary_advance' && rnd() < 0.35 ? 'azania' : pick(['web', 'web', 'app']);
      const order = await prisma.order.create({
        data: {
          number: orderNumber(brandKey, seq),
          brandKey,
          customerId: customers[ci]!.id,
          contactName: name,
          contactPhone: phone,
          region,
          addressLine: `${region} — demo address`,
          channel,
          paymentMethod: method,
          status,
          subtotal,
          deliveryFee: delivery,
          total,
          months,
          branch: region,
          consentAt: createdAt,
          createdAt,
          items: { create: items.map((p) => ({ productId: p.id, name: p.name, model: p.model, price: p.price, qty: 1 })) },
          events: { create: [{ status: 'placed', note: 'Order placed', at: createdAt, actor: 'customer' }, ...(status !== 'placed' ? [{ status, note: 'Seeded status', at: new Date(createdAt.getTime() + 3_600_000), actor: 'system' }] : [])] },
          payments: {
            create: {
              method,
              amount: total,
              status: method === 'salary_advance' ? (status === 'rejected' ? 'failed' : status === 'bank_review' ? 'pending' : 'captured') : method === 'pay_on_delivery' ? (status === 'delivered' ? 'captured' : 'pending') : status === 'placed' ? 'pending' : 'captured',
              reference: `MOCK-${seq}`,
              createdAt,
            },
          },
        },
      });
      made++;
      if (!['placed', 'cancelled'].includes(status)) {
        await prisma.invoice.create({ data: { number: `INV-${createdAt.getUTCFullYear()}-${String(counters.invoice++).padStart(5, '0')}`, orderId: order.id, amount: total, status: status === 'delivered' || method !== 'pay_on_delivery' ? 'paid' : 'issued', issuedAt: createdAt } });
      }
      if (method === 'salary_advance' && months) {
        const monthly = monthlyInstalment(total, months);
        const advStatus: AdvanceStatus = status === 'bank_review' ? 'submitted' : status === 'rejected' ? 'rejected' : day > 6 ? 'repaying' : day > 3 ? 'disbursed' : 'approved';
        const nida = normaliseNida(`19${80 + (ci % 15)}0101${String(10000 + ci * 37).padStart(5, '0')}00001${String(10 + ci).slice(-2)}`)!;
        const account = `01${String(1000000000 + ci * 7919).slice(0, 10)}`;
        const app = await prisma.salaryAdvanceApplication.create({
          data: {
            orderId: order.id,
            fullName: name,
            phone,
            nidaEnc: encrypt(nida),
            nidaLast4: nida.replace(/\D/g, '').slice(-4),
            employer,
            checkNumber: String(100000 + ci * 311),
            jobTitle: title,
            netSalaryEnc: encrypt(String(salary)),
            accountEnc: encrypt(account),
            accountLast4: account.slice(-4),
            termMonths: months,
            monthly,
            total,
            ratioPercent: Math.round((monthly / salary) * 100),
            status: advStatus,
            channel,
            bankReference: advStatus === 'submitted' ? '' : `AZB-${seq}`,
            decidedAt: advStatus === 'submitted' ? null : new Date(createdAt.getTime() + 5 * 3_600_000),
            decidedBy: advStatus === 'submitted' ? null : 'Azania Bank (mock)',
            createdAt,
            schedule: { create: buildSchedule(total, months, createdAt).map((s) => ({ n: s.n, dueDate: s.dueDate, amount: s.amount, paidAt: s.dueDate.getTime() < now && advStatus === 'repaying' ? s.dueDate : null })) },
          },
        });
        const cno = `AZB-SA-${counters.contract++}`;
        await prisma.contract.create({
          data: {
            number: cno,
            applicationId: app.id,
            pdfKey: '', // generated on first download
            sha256: sha256(`${cno}|${name}|${total}|${months}`),
            signedAt: createdAt,
            signerName: name,
            consents: [
              { text: 'I have read and accept the terms of this agreement.', acceptedAt: createdAt.toISOString() },
              { text: 'I authorise my employer and Azania Bank to deduct the monthly instalment from my salary.', acceptedAt: createdAt.toISOString() },
            ],
          },
        });
      }
    }
  }
  console.log(`  ${made} demo orders`);

  // Fixed demo orders used in docs and prototype copy (track MU-10482 / SW-20391).
  for (const [num, brandKey, pid, region, status] of [
    ['MU-10482', 'mruk', 'mruk-uk-g3500q', 'Zanzibar', 'out_for_delivery'],
    ['SW-20391', 'skywood', 'skywood-multi-purpose-blender-p5a', 'Dar es Salaam', 'out_for_delivery'],
  ] as const) {
    const p = byId.get(pid)!;
    const delivery = deliveryFee(region, p.price);
    await prisma.order.create({
      data: {
        number: num,
        brandKey,
        contactName: 'Asha Said',
        contactPhone: '+255777210554',
        region,
        channel: 'web',
        paymentMethod: 'azania_account',
        status,
        subtotal: p.price,
        deliveryFee: delivery,
        total: p.price + delivery,
        consentAt: new Date(),
        items: { create: { productId: p.id, name: p.name, model: p.model, price: p.price, qty: 1 } },
        events: { create: [{ status: 'placed', note: 'Order placed', actor: 'customer' }, { status: 'approved', note: 'Payment confirmed', actor: 'system' }, { status: 'packed', note: 'Packed at warehouse', actor: 'system' }, { status, note: 'Dispatched', actor: 'system' }] },
        payments: { create: { method: 'azania_account', amount: p.price + delivery, status: 'captured', reference: `MOCK-${num}` } },
      },
    });
  }

  // Tickets ---------------------------------------------------------------
  const tickets = [
    ['mruk', 'Repair', 'Neema Mushi', '+255754000214', 'mruk-uk-f275-58-5di0wd', 'Fridge is not cooling on the bottom shelf since yesterday.', 'new'],
    ['skywood', 'Installation', 'John Kimaro', '+255713441902', 'skywood-csdc-12k', 'Need installation for the 12,000 BTU AC in Arusha.', 'open'],
    ['mruk', 'Warranty claim', 'Hamisi Juma', '+255786021993', 'mruk-uk-g3500q', 'Generator stops after 2 hours of running.', 'new'],
    ['skywood', 'Delivery', 'Peter Lyimo', '+255684330118', 'skywood-s-06', 'When will my order arrive in Mwanza?', 'resolved'],
  ] as const;
  for (const [brandKey, issue, name, phone, productId, description, status] of tickets) {
    await prisma.ticket.create({ data: { number: `TK-${counters.ticket++}`, brandKey, issue, name, phone, productId, description, status, messages: { create: { author: name, body: description } } } });
  }

  // Counters and settings ------------------------------------------------------
  await prisma.counter.createMany({
    data: [
      { key: 'order:mruk', value: Math.max(counters.mruk, 10_483) },
      { key: 'order:skywood', value: Math.max(counters.skywood, 20_392) },
      { key: 'invoice', value: counters.invoice },
      { key: 'contract', value: counters.contract },
      { key: 'ticket', value: counters.ticket },
    ],
  });
  await prisma.setting.createMany({
    data: [
      { key: 'notifications', value: { orders: true, bank: true, stock: true, tickets: true, daily: false } },
      { key: 'security', value: { sessionTimeoutMinutes: 30, require2fa: true, backups: 'daily' } },
      { key: 'regions', value: REGIONS.map((r) => ({ ...r })) },
    ],
  });

  console.log('\nSeed complete.');
  console.log(`Staff logins (password: ${process.env.SEED_STAFF_PASSWORD ? '$SEED_STAFF_PASSWORD' : staffPassword}):`);
  for (const [name, email, roleId] of staff) console.log(`  ${email.padEnd(26)} ${ROLE_NAMES[roleId]} (${name})`);
  console.log('Two-factor authentication is enrolled on first sign-in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
