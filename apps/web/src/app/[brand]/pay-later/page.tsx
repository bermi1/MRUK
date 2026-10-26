import type { Metadata } from 'next';
import Link from 'next/link';
import { fmt } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getCms, getProducts } from '@/server/catalog';
import { getT } from '@/server/locale';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('payLaterHow'), description: t('payLaterIntro') };
}

const STEPS = [
  ['plStep1', 'plStep1Sub'],
  ['plStep2', 'plStep2Sub'],
  ['plStep3', 'plStep3Sub'],
  ['plStep4', 'plStep4Sub'],
  ['plStep5', 'plStep5Sub'],
] as const;
const ELIG = ['plElig1', 'plElig2', 'plElig3', 'plElig4'] as const;
const FAQ = [
  ['plQ1', 'plA1'],
  ['plQ2', 'plA2'],
  ['plQ3', 'plA3'],
  ['plQ4', 'plA4'],
  ['plQ5', 'plA5'],
] as const;

/** "How Pay Later works": steps, eligibility and FAQ (same content, each brand's own look). */
export default async function PayLaterPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [cms, products, t] = await Promise.all([getCms(key), getProducts(key), getT()]);
  const example = products.find((p) => p.id === cms.hero[0]?.pid) ?? products.find((p) => p.img) ?? products[0];
  const b = `/${key}`;
  return (
    <div className="pl">
      <section className="pl-hero">
        <div className="wrap pl-hero-in">
          <div>
            <p className="pl-kicker">{t('salaryAdvance')}</p>
            <h1>{t('payLaterTitle')}</h1>
            <p className="pl-intro">{t('payLaterIntro')}</p>
            <div className="pl-cta">
              <Link href={`${b}/shop`} className="pl-btn">
                {t('plShop')} <span aria-hidden="true">→</span>
              </Link>
              <a href="#how" className="pl-link">
                {t('payLaterHow')}
              </a>
            </div>
          </div>
          {example && (
            <div className="pl-calc" aria-label={t('plExample', { name: example.name })}>
              <p className="pl-calc-t">{t('plExample', { name: example.name })}</p>
              <p className="pl-calc-p">{fmt(example.price)}</p>
              <ul>
                {[3, 6, 12].map((m) => (
                  <li key={m}>
                    <span>{t('months', { n: m })}</span>
                    <b>{t('perMonthShort', { amount: fmt(example.price / m) })}</b>
                  </li>
                ))}
              </ul>
              <img src="/brand/azania-bank.png" alt="Azania Bank" width={41} height={32} loading="lazy" />
            </div>
          )}
        </div>
      </section>

      <section id="how" className="wrap pl-sec" aria-labelledby="pl-how">
        <h2 id="pl-how">{t('payLaterHow')}</h2>
        <ol className="pl-steps">
          {STEPS.map(([a, s], i) => (
            <li key={a} data-reveal style={{ ['--i' as string]: i }}>
              <span className="pl-n">{i + 1}</span>
              <b>{t(a)}</b>
              <span>{t(s)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="eligibility" className="wrap pl-sec pl-two" aria-labelledby="pl-elig">
        <div>
          <h2 id="pl-elig">{t('payLaterEligibility')}</h2>
          <p className="pl-note">{t('plEligNote')}</p>
        </div>
        <ul className="pl-elig">
          {ELIG.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      </section>

      <section id="faq" className="wrap pl-sec pl-two" aria-labelledby="pl-faq">
        <h2 id="pl-faq">{t('payLaterFaq')}</h2>
        <div className="pl-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{t(q)}</summary>
              <p>{t(a)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
