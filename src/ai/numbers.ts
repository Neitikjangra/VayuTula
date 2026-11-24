/**
 * Number check (PRD 6, guardrail 1): every number in AI text must equal an engine value as
 * displayed. Pollutant names (PM2.5, CO₂) are not numbers; HH:MM times count as their hour.
 */

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function toLatinDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
}

/** All numbers in the text, in order. "1,811" and "1,00,000" are single numbers. */
export function extractNumbers(text: string): number[] {
  const found: number[] = [];
  let s = toLatinDigits(text)
    .replace(/PM\s?2[.·]5|PM₂\.₅/gi, ' ')
    .replace(/CO2|CO₂/gi, ' ');
  s = s.replace(/\b(\d{1,2}):\d{2}\b/g, (_match, hour: string) => {
    found.push(Number(hour));
    return ' ';
  });
  for (const m of s.matchAll(/\d+(?:,\d+)*(?:\.\d+)?/g)) found.push(Number(m[0].replace(/,/g, '')));
  return found;
}

/** Numbers in the text that are not exactly one of `allowed`. */
export function unexpectedNumbers(text: string, allowed: number[]): number[] {
  const ok = new Set(allowed.map((n) => Math.abs(n)));
  return extractNumbers(text).filter((n) => !ok.has(n));
}
