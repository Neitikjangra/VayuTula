'use client';

import { useId, useState, type FormEvent } from 'react';
import { healthStatements } from '@/config';
import { MAX_INTAKE_CHARS } from '@/domain';
import { t, type Lang } from '@/i18n';
import { ChatLog } from './ChatLog';
import type { Draft } from './draft';
import { FieldGroup } from './fields';
import { ProfileSummary } from './ProfileSummary';
import { SaveArea } from './SaveArea';
import { useIntake } from './useIntake';

const CONSULT = healthStatements.find((s) => s.id === 'consult-doctor');

interface InputProps {
  lang: Lang;
  busy: boolean;
  onSend: (text: string) => void;
}

function ChatInput({ lang, busy, onSend }: InputProps) {
  const id = useId();
  const [text, setText] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend(text);
    setText('');
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-900">
        {t(lang, 'intake.label')}
      </label>
      <textarea
        id={id}
        rows={4}
        required
        maxLength={MAX_INTAKE_CHARS}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-lg border border-slate-500 bg-white p-3 text-base text-slate-900"
      />
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 self-end rounded-lg bg-sky-900 px-5 py-2 text-base font-medium text-white disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
      >
        {t(lang, busy ? 'intake.sending' : 'intake.send')}
      </button>
    </form>
  );
}

/** One reply failed: keep the conversation and offer to resend (the form stays one tap away). */
function RetryNotice({ lang, onRetry }: { lang: Lang; onRetry: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-slate-500 bg-slate-50 p-3"
    >
      <p className="text-base text-slate-900">{t(lang, 'intake.failed')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 self-start rounded-lg bg-sky-900 px-4 py-2 text-base font-medium text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
      >
        {t(lang, 'intake.retry')}
      </button>
    </div>
  );
}

/** The see-a-doctor statement (when symptoms are mentioned) and the rate-limit note. */
function Notices({
  lang,
  symptom,
  rateLimited,
}: {
  lang: Lang;
  symptom: boolean;
  rateLimited: boolean;
}) {
  return (
    <>
      {symptom && CONSULT && (
        <p
          role="alert"
          className="rounded-lg border border-amber-700 bg-amber-50 p-3 text-base text-amber-950"
        >
          {lang === 'hi' ? CONSULT.hi : CONSULT.en}
        </p>
      )}
      {rateLimited && (
        <p role="status" className="text-base text-slate-800">
          {t(lang, 'intake.rateLimited')}
        </p>
      )}
    </>
  );
}

interface Props {
  lang: Lang;
  draft: Draft;
  invalid: boolean;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onFallback: () => void;
  onEdit: () => void;
}

/** FR-1 chat-style setup: conversation, health notice, live summary and save. */
export function IntakePanel({ lang, draft, invalid, onChange, onSave, onFallback, onEdit }: Props) {
  const intake = useIntake(lang, { onChange, onFallback });
  return (
    <div className="flex flex-col gap-4">
      <FieldGroup legend={t(lang, 'intake.heading')}>
        <ChatLog lang={lang} lines={intake.lines} />
        <Notices lang={lang} symptom={intake.symptom} rateLimited={intake.rateLimited} />
        {intake.failed && !intake.busy && (
          <RetryNotice lang={lang} onRetry={() => void intake.retry(draft)} />
        )}
        {!intake.progress.done && (
          <ChatInput
            lang={lang}
            busy={intake.busy}
            onSend={(text) => void intake.send(text, draft)}
          />
        )}
      </FieldGroup>
      <ProfileSummary
        lang={lang}
        draft={draft}
        answered={intake.progress.answered}
        roomsKnown={intake.progress.facts.rooms !== undefined}
        onEdit={onEdit}
      />
      <SaveArea lang={lang} invalid={invalid} onSave={onSave} />
    </div>
  );
}
