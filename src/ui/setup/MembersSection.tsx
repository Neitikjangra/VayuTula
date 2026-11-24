'use client';

import { AGE_GROUPS } from '@/domain';
import { format, t, type Lang } from '@/i18n';
import { addMember, removeMember, updateMember, type Draft, type DraftMember } from './draft';
import { CheckboxField, FieldGroup, SECONDARY_BUTTON, SelectField, TextField } from './fields';

interface Props {
  lang: Lang;
  draft: Draft;
  onChange: (draft: Draft) => void;
}

function MemberRow({ lang, draft, member, onChange }: Props & { member: DraftMember }) {
  const update = (patch: Partial<DraftMember>) => onChange(updateMember(draft, member.id, patch));
  const ages = AGE_GROUPS.map((value) => ({ value, label: t(lang, `age.${value}`) }));
  return (
    <li className="flex flex-col gap-3 border-b border-slate-200 pb-3 last:border-0">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label={t(lang, 'member.label')}
          value={member.label}
          maxLength={40}
          onChange={(label) => update({ label })}
        />
        <SelectField
          label={t(lang, 'member.age')}
          value={member.ageGroup}
          options={ages}
          onChange={(ageGroup) => update({ ageGroup })}
        />
      </div>
      <CheckboxField
        label={t(lang, 'member.sensitive')}
        checked={member.sensitive}
        onChange={(sensitive) => update({ sensitive })}
      />
      {draft.members.length > 1 && (
        <button
          type="button"
          className={`${SECONDARY_BUTTON} self-start`}
          onClick={() => onChange(removeMember(draft, member.id))}
        >
          {format(lang, 'member.remove', { name: member.label })}
        </button>
      )}
    </li>
  );
}

/** Who lives here: name, age group and extra-care flag per person. */
export function MembersSection({ lang, draft, onChange }: Props) {
  return (
    <FieldGroup legend={t(lang, 'members.heading')}>
      <ul className="flex flex-col gap-3">
        {draft.members.map((member) => (
          <MemberRow
            key={member.id}
            lang={lang}
            draft={draft}
            member={member}
            onChange={onChange}
          />
        ))}
      </ul>
      <button
        type="button"
        className={`${SECONDARY_BUTTON} self-start`}
        onClick={() => onChange(addMember(draft, ''))}
      >
        {t(lang, 'member.add')}
      </button>
    </FieldGroup>
  );
}
