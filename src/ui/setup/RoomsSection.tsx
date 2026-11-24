'use client';

import { t, type Lang } from '@/i18n';
import { addRoom, type Draft } from './draft';
import { FieldGroup, SECONDARY_BUTTON } from './fields';
import { RoomCard, type PurifierChoice } from './RoomCard';

interface Props {
  lang: Lang;
  draft: Draft;
  purifiers: PurifierChoice[];
  onChange: (draft: Draft) => void;
}

/** All rooms (up to 8). */
export function RoomsSection({ lang, draft, purifiers, onChange }: Props) {
  return (
    <FieldGroup legend={t(lang, 'rooms.heading')}>
      <ul className="flex flex-col gap-3">
        {draft.rooms.map((room) => (
          <RoomCard
            key={room.id}
            lang={lang}
            draft={draft}
            room={room}
            purifiers={purifiers}
            onChange={onChange}
          />
        ))}
      </ul>
      {draft.rooms.length < 8 && (
        <button
          type="button"
          className={`${SECONDARY_BUTTON} self-start`}
          onClick={() => onChange(addRoom(draft, t(lang, 'room.defaultNew')))}
        >
          {t(lang, 'room.add')}
        </button>
      )}
    </FieldGroup>
  );
}
