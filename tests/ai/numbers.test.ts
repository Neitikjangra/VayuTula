import { describe, expect, it } from 'vitest';
import { extractNumbers, unexpectedNumbers } from '@/ai/numbers';

describe('extractNumbers() (PRD 6, guardrail 1)', () => {
  it.each<[string, number[]]>([
    ['Cuts 1,811 µg·h/m³ over the next 24 h.', [1811, 24]],
    ['Saves ₹2,065 a month and 60 kg of CO₂.', [2065, 60]],
    ['PM2.5 drops by 12 g; CO2 by 4.3 kg.', [12, 4.3]],
    ['Run it from 22:00 to 07:00.', [22, 7]],
    ['Indian grouping: ₹1,00,000.', [100000]],
    ['हर महीने ₹८८ का खर्च', [88]],
    ['No numbers here at all.', []],
  ])('reads %s', (text, numbers) => {
    expect(extractNumbers(text)).toEqual(numbers);
  });
});

describe('unexpectedNumbers()', () => {
  it('passes numbers that match the engine exactly as displayed', () => {
    expect(unexpectedNumbers('Saves ₹2,065 and 64.3 kg CO₂ a month.', [2065, 64.3])).toEqual([]);
  });

  it('flags invented or re-rounded numbers', () => {
    expect(unexpectedNumbers('Saves about ₹2,000 a month.', [2065])).toEqual([2000]);
    expect(unexpectedNumbers('Cuts 64 kg of CO₂.', [64.3])).toEqual([64]);
  });
});
