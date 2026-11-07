import Link from 'next/link';

/**
 * The Azania mini app sells only on Pay Later. While the admin has Pay Later off for both brands
 * (the bank agreement is still being negotiated) it shows this polite notice instead of the shop.
 */
export function MiniSoon({ labels }: { labels: { title: string; body: string; shop: string } }) {
  return (
    <div className="mn-screen white">
      <div className="mn-gate" data-testid="mini-soon">
        <div className="logos">
          <img className="az" src="/brand/azania-mark.png" alt="Azania Bank" />
        </div>
        <div className="mn-eyebrow">MINI APP IN AZANIA</div>
        <h1>{labels.title}</h1>
        <p>{labels.body}</p>
        <div className="logos" aria-hidden="true">
          <img src="/brand/mruk.png" alt="" />
          <img src="/brand/skywood.png" alt="" />
        </div>
        <Link className="mn-link" href="/">
          {labels.shop}
        </Link>
      </div>
    </div>
  );
}
