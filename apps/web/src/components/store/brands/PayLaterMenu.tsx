import Link from 'next/link';
import type { HeaderLabels } from './shared';

/** Pay Later dropdown content (both brands; styled by each brand's stylesheet). */
export function PayLaterMenu({ brand, labels, className }: { brand: string; labels: HeaderLabels; className: string }) {
  const b = `/${brand}/pay-later`;
  return (
    <div className={className}>
      <div className="plm-intro">
        <p className="plm-by">{labels.payLaterBy}</p>
        <ul className="plm-links">
          <li>
            <Link href={`${b}#how`}>{labels.payLaterHow}</Link>
          </li>
          <li>
            <Link href={`${b}#eligibility`}>{labels.payLaterEligibility}</Link>
          </li>
          <li>
            <Link href={`${b}#faq`}>{labels.payLaterFaq}</Link>
          </li>
        </ul>
      </div>
      <ol className="plm-steps">
        {labels.payLaterSteps.map((s, i) => (
          <li key={s} style={{ ['--i' as string]: i }}>
            <span className="plm-n">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
