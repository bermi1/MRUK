import { describe, expect, it } from 'vitest';
import { cleanSpecs, factKind, featureFacts, highlights } from '../src';

describe('product facts', () => {
  it('classifies features by what they state', () => {
    expect(factKind('12,000 BTU')).toBe('cooling');
    expect(factKind('Inverter')).toBe('cooling');
    expect(factKind('5 HP')).toBe('power');
    expect(factKind('Key starter')).toBe('power');
    expect(factKind('200 litres')).toBe('capacity');
    expect(factKind('42 inch')).toBe('size');
    expect(factKind('12 hour timer')).toBe('timer');
    expect(factKind('High flow')).toBe('water');
    expect(factKind('Electronic temperature control')).toBe('temperature');
    expect(factKind('Reversible door')).toBe('feature');
  });

  it('derives spec rows only from measurable features, one per kind', () => {
    expect(featureFacts(['5 HP', '7 HP', 'High flow', '200 litres', ' ', '42 inch', 'Inverter'])).toEqual([
      { kind: 'power', value: '5 HP' },
      { kind: 'capacity', value: '200 litres' },
      { kind: 'size', value: '42 inch' },
    ]);
    expect(featureFacts([])).toEqual([]);
  });

  it('picks up to four distinct highlights', () => {
    expect(highlights(['A', 'a', '', '5 HP', 'B', 'C', 'D']).map((h) => h.text)).toEqual(['A', '5 HP', 'B', 'C']);
    expect(highlights(['5 HP'], 2)).toEqual([{ kind: 'power', text: '5 HP' }]);
  });

  it('drops blank and malformed spec rows', () => {
    expect(cleanSpecs([{ label: ' Power ', value: '2.8 kW' }, { label: 'Warranty', value: '' }, { label: 3, value: 'x' }, null as never])).toEqual([{ label: 'Power', value: '2.8 kW' }]);
    expect(cleanSpecs(undefined)).toEqual([]);
  });
});
