import type { FactKind } from '@bt/core';
import { BoltIcon, BoxIcon, ClockIcon, DropIcon, RulerIcon, SnowIcon, SparkleIcon, ThermoIcon } from '../../icons';

const ICON: Record<FactKind, (p: { size?: number; strokeWidth?: number }) => React.ReactNode> = {
  capacity: BoxIcon,
  power: BoltIcon,
  cooling: SnowIcon,
  size: RulerIcon,
  timer: ClockIcon,
  water: DropIcon,
  temperature: ThermoIcon,
  feature: SparkleIcon,
};

/** 3–4 key features under the title, each with an icon matching what it states. */
export function Highlights({ items, label }: { items: { kind: FactKind; text: string }[]; label: string }) {
  if (!items.length) return null;
  return (
    <ul className="pdp-hl" aria-label={label} data-testid="pdp-highlights">
      {items.map((h) => {
        const Icon = ICON[h.kind];
        return (
          <li key={h.text}>
            <span className="pdp-hl-i" aria-hidden="true">
              <Icon size={20} strokeWidth={1.7} />
            </span>
            <span className="pdp-hl-t">{h.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
