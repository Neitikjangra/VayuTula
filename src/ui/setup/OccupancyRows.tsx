'use client';

import { t, type Lang } from '@/i18n';
import type { Draft, DraftRoom } from './draft';
import { SECONDARY_BUTTON, SelectField, hourOptions, type Option } from './fields';

type Occupancy = DraftRoom['occupancy'][number];

interface RowProps {
  lang: Lang;
  row: Occupancy;
  people: Option<string>[];
  onChange: (patch: Partial<Occupancy>) => void;
  onRemove: () => void;
}

function OccupancyRow({ lang, row, people, onChange, onRemove }: RowProps) {
  const hours = hourOptions();
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      <SelectField
        label={t(lang, 'occupancy.person')}
        value={row.memberId}
        options={people}
        onChange={(memberId) => onChange({ memberId })}
      />
      <SelectField
        label={t(lang, 'occupancy.from')}
        value={row.fromHour}
        options={hours}
        onChange={(fromHour) => onChange({ fromHour })}
      />
      <SelectField
        label={t(lang, 'occupancy.to')}
        value={row.toHour % 24}
        options={hours}
        onChange={(toHour) => onChange({ toHour })}
      />
      <button
        type="button"
        className={`${SECONDARY_BUTTON} col-span-3 justify-self-start`}
        onClick={onRemove}
      >
        {t(lang, 'occupancy.remove')}
      </button>
    </div>
  );
}

interface Props {
  lang: Lang;
  draft: Draft;
  room: DraftRoom;
  onRoomChange: (patch: Partial<DraftRoom>) => void;
}

/** "Who is here, and when" rows for one room. */
export function OccupancyRows({ lang, draft, room, onRoomChange }: Props) {
  const people = draft.members.map((m) => ({ value: m.id, label: m.label || m.id }));
  const rows = room.occupancy;
  const setRow = (i: number, patch: Partial<Occupancy>) =>
    onRoomChange({ occupancy: rows.map((o, j) => (i === j ? { ...o, ...patch } : o)) });
  const addRow = () => {
    const memberId = draft.members[0]?.id ?? '';
    onRoomChange({ occupancy: [...rows, { memberId, fromHour: 22, toHour: 7 }] });
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-slate-900">{t(lang, 'room.occupancy')}</legend>
      {rows.map((row, i) => (
        <OccupancyRow
          key={i}
          lang={lang}
          row={row}
          people={people}
          onChange={(patch) => setRow(i, patch)}
          onRemove={() => onRoomChange({ occupancy: rows.filter((_, j) => j !== i) })}
        />
      ))}
      <button type="button" className={`${SECONDARY_BUTTON} self-start`} onClick={addRow}>
        {t(lang, 'occupancy.add')}
      </button>
    </fieldset>
  );
}
