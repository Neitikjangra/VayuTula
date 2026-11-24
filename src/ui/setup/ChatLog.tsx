'use client';

import { format, t, type Lang } from '@/i18n';
import type { ChatLine } from './useIntake';

function assistantText(lang: Lang, line: Extract<ChatLine, { role: 'assistant' }>): string {
  if (line.text) return line.text;
  if (line.missing === 1) return t(lang, 'intake.ask.membersMoreOne');
  if (line.missing) return format(lang, 'intake.ask.membersMore', { count: line.missing });
  return line.field === 'done' ? t(lang, 'intake.done') : t(lang, `intake.ask.${line.field}`);
}

function Bubble({ lang, line }: { lang: Lang; line: ChatLine }) {
  const mine = line.role === 'user';
  const speaker = t(lang, mine ? 'intake.you' : 'intake.helper');
  const text = mine ? line.text : assistantText(lang, line);
  const ai = !mine && line.text !== null;
  return (
    <li
      className={`flex flex-col gap-1 rounded-xl p-3 ${mine ? 'self-end bg-sky-50' : 'self-start bg-white'} max-w-[90%] border border-slate-300`}
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        {speaker}
        {ai && (
          <span className="rounded-full border border-slate-500 px-2 font-normal">
            {t(lang, 'intake.aiWritten')}
          </span>
        )}
      </span>
      <span className="text-base whitespace-pre-wrap text-slate-900">{text}</span>
    </li>
  );
}

/** The conversation: a fixed welcome, then user and assistant turns (announced politely). */
export function ChatLog({ lang, lines }: { lang: Lang; lines: ChatLine[] }) {
  return (
    <ol aria-live="polite" className="flex flex-col gap-2">
      <li className="max-w-[90%] self-start rounded-xl border border-slate-300 bg-white p-3">
        <span className="block text-xs font-semibold text-slate-700">
          {t(lang, 'intake.helper')}
        </span>
        <span className="text-base text-slate-900">{t(lang, 'intake.welcome')}</span>
      </li>
      {lines.map((line, i) => (
        <Bubble key={i} lang={lang} line={line} />
      ))}
    </ol>
  );
}
