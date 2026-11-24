'use client';

import type { HourRange } from '@/domain';
import { t, type Lang } from '@/i18n';
import type { DraftRoom } from './draft';
import { CheckboxField, SelectField, hourOptions, type Option } from './fields';

export interface PurifierChoice {
  id: string;
  label: string;
}

type Update = (patch: Partial<DraftRoom>) => void;

function ScheduleFields({ lang, hours, update }: { lang: Lang; hours: HourRange; update: Update }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <SelectField
        label={t(lang, 'occupancy.from')}
        value={hours.fromHour}
        options={hourOptions()}
        onChange={(fromHour) => update({ purifierHours: { ...hours, fromHour } })}
      />
      <SelectField
        label={t(lang, 'occupancy.to')}
        value={hours.toHour % 24}
        options={hourOptions()}
        onChange={(toHour) => update({ purifierHours: { ...hours, toHour } })}
      />
    </div>
  );
}

interface Props {
  lang: Lang;
  room: DraftRoom;
  purifiers: PurifierChoice[];
  update: Update;
}

/** Which purifier the room has (if any) and when it usually runs today. */
export function PurifierFields({ lang, room, purifiers, update }: Props) {
  const options: Option<string>[] = [
    { value: '', label: t(lang, 'purifier.none') },
    { value: 'unknown', label: t(lang, 'purifier.unknown') },
    ...purifiers.map((p) => ({ value: p.id, label: p.label })),
  ];
  const hours = room.purifierHours;
  const choose = (id: string) =>
    update({ purifierId: id || undefined, purifierHours: id ? hours : undefined });
  const toggle = (on: boolean) =>
    update({ purifierHours: on ? { fromHour: 22, toHour: 7 } : undefined });
  return (
    <>
      <SelectField
        label={t(lang, 'room.purifier')}
        value={room.purifierId ?? ''}
        options={options}
        onChange={choose}
      />
      {room.purifierId && (
        <CheckboxField
          label={t(lang, 'room.purifierRuns')}
          checked={hours !== undefined}
          onChange={toggle}
        />
      )}
      {room.purifierId && hours && <ScheduleFields lang={lang} hours={hours} update={update} />}
    </>
  );
}
