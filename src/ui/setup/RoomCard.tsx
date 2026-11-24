'use client';

import { ROOM_KINDS, WINDOW_TYPES, type WindowType } from '@/domain';
import { format, t, type Lang } from '@/i18n';
import { removeRoom, updateRoom, type Draft, type DraftRoom } from './draft';
import { NumberField, SECONDARY_BUTTON, SelectField, TextField, type Option } from './fields';
import { OccupancyRows } from './OccupancyRows';
import { PurifierFields, type PurifierChoice } from './PurifierFields';

export type { PurifierChoice } from './PurifierFields';

type WindowChoice = WindowType | 'unknown';
type Update = (patch: Partial<DraftRoom>) => void;

interface PartProps {
  lang: Lang;
  room: DraftRoom;
  update: Update;
}

function RoomIdentity({ lang, room, update }: PartProps) {
  const kinds = ROOM_KINDS.map((value) => ({ value, label: t(lang, `kind.${value}`) }));
  return (
    <>
      <TextField
        label={t(lang, 'room.name')}
        value={room.name}
        maxLength={40}
        onChange={(name) => update({ name })}
      />
      <SelectField
        label={t(lang, 'room.kind')}
        value={room.kind}
        options={kinds}
        onChange={(kind) => update({ kind })}
      />
    </>
  );
}

function RoomBasics({ lang, room, update }: PartProps) {
  const windows: Option<WindowChoice>[] = [...WINDOW_TYPES, 'unknown' as const].map((value) => ({
    value,
    label: t(lang, `window.${value}`),
  }));
  const setWindow = (w: WindowChoice) => update({ windowType: w === 'unknown' ? undefined : w });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <RoomIdentity lang={lang} room={room} update={update} />
      <NumberField
        label={t(lang, 'room.area')}
        value={room.areaM2}
        min={2}
        max={200}
        step={0.5}
        onChange={(areaM2) => update({ areaM2 })}
      />
      <NumberField
        label={t(lang, 'room.height')}
        value={room.heightM ?? 2.8}
        min={2}
        max={5}
        step={0.1}
        onChange={(heightM) => update({ heightM })}
      />
      <SelectField
        label={t(lang, 'room.window')}
        value={room.windowType ?? 'unknown'}
        options={windows}
        onChange={setWindow}
      />
    </div>
  );
}

interface Props {
  lang: Lang;
  draft: Draft;
  room: DraftRoom;
  purifiers: PurifierChoice[];
  onChange: (draft: Draft) => void;
}

/** One room: name, type, size, windows, purifier and who is there when. */
export function RoomCard({ lang, draft, room, purifiers, onChange }: Props) {
  const update: Update = (patch) => onChange(updateRoom(draft, room.id, patch));
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
      <RoomBasics lang={lang} room={room} update={update} />
      <PurifierFields lang={lang} room={room} purifiers={purifiers} update={update} />
      <OccupancyRows lang={lang} draft={draft} room={room} onRoomChange={update} />
      {draft.rooms.length > 1 && (
        <button
          type="button"
          className={`${SECONDARY_BUTTON} self-start`}
          onClick={() => onChange(removeRoom(draft, room.id))}
        >
          {format(lang, 'room.remove', { name: room.name })}
        </button>
      )}
    </li>
  );
}
