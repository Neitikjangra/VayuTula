'use client';

import { useId, type ReactNode } from 'react';

const INPUT =
  'min-h-11 w-full rounded-lg border border-slate-500 bg-white px-3 text-base text-slate-900';
const LABEL = 'text-sm font-medium text-slate-900';

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

/** Labelled <select>; option values keep their type (string or number). */
export function SelectField<T extends string | number>(props: SelectProps<T>) {
  const id = useId();
  const { label, value, options, onChange, hideLabel } = props;
  const pick = (raw: string) => {
    const found = options.find((o) => String(o.value) === raw);
    if (found) onChange(found.value);
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : LABEL}>
        {label}
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => pick(e.target.value)}
        className={INPUT}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NumberProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

/** Labelled number input with native range checks (the schema checks again on save). */
export function NumberField({ label, value, min, max, step = 1, onChange }: NumberProps) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        required
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className={INPUT}
      />
    </div>
  );
}

interface TextProps {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}

export function TextField({ label, value, maxLength, onChange }: TextProps) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        required
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </div>
  );
}

interface CheckProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-sky-900"
      />
      <label htmlFor={id} className="text-base text-slate-900">
        {label}
      </label>
    </div>
  );
}

/** A titled group of fields. */
export function FieldGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4">
      <legend className="px-1 text-lg font-semibold text-slate-900">{legend}</legend>
      {children}
    </fieldset>
  );
}

/** 0–23 as "00:00" … "23:00". */
export function hourOptions(): Option<number>[] {
  return Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: `${String(h).padStart(2, '0')}:00`,
  }));
}

export const SECONDARY_BUTTON =
  'min-h-11 rounded-lg border border-sky-900 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800';
