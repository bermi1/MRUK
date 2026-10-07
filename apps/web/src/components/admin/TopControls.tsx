'use client';
import { useTransition } from 'react';
import { setAdminFilterAction } from '@/app/actions/admin';

export function TopControls({ brand, brands, branch, branches }: { brand: string; brands: string[]; branch: string; branches: string[] }) {
  const [pending, start] = useTransition();
  const set = (kind: 'brand' | 'branch', v: string) => start(async () => void (await setAdminFilterAction(kind, v)));
  const segs = [
    ['all', 'All brands'],
    ['mruk', 'Mr UK'],
    ['skywood', 'Skywood'],
  ].filter(([k]) => k === 'all' ? brands.length > 1 : brands.includes(k!));
  return (
    <>
      <div className="ad-seg" role="group" aria-label="Brand filter" style={{ marginLeft: 'auto', opacity: pending ? 0.7 : 1 }}>
        {segs.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={brand === k} onClick={() => set('brand', k!)}>
            {l}
          </button>
        ))}
      </div>
      <label className="ad-branch">
        Branch:
        <select value={branch} onChange={(e) => set('branch', e.target.value)} aria-label="Branch filter">
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
