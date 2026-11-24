'use client';

import { useState } from 'react';
import { appConfig } from '@/config';
import { membersStillToDescribe, type IntakeResponse, type NextField } from '@/domain';
import { applyFacts } from '@/engine/intakeMerge';
import type { Lang } from '@/i18n';
import type { Draft } from './draft';
import { postIntake } from './intakeClient';
import { INITIAL_PROGRESS, nextProgress, type IntakeProgress } from './intakeProgress';

/**
 * A chat line. Assistant lines with text null show the built-in question for `field`;
 * `missing` is how many stated people are not described yet (members question only).
 */
export type ChatLine =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string | null; field: NextField; missing?: number };

interface Handlers {
  onChange: (draft: Draft) => void;
  onFallback: () => void;
}

/** After this many failed replies in a row the chat hands over to the form. */
const FAILURES_BEFORE_FORM = 2;

/** The assistant's line for a reply; a built-in question when people are still missing. */
function replyLine(reply: IntakeResponse, next: IntakeProgress): ChatLine {
  const missing = reply.nextField === 'members' ? membersStillToDescribe(next.facts) : 0;
  if (missing > 0) return { role: 'assistant', text: null, field: 'members', missing };
  return { role: 'assistant', text: reply.question, field: reply.nextField };
}

/** FR-1 conversation state: sends a turn, merges facts, offers a retry, then falls back. */
export function useIntake(lang: Lang, { onChange, onFallback }: Handlers) {
  const [progress, setProgress] = useState<IntakeProgress>(INITIAL_PROGRESS);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [symptom, setSymptom] = useState(false);
  /** The message whose reply failed, kept so "Try again" can resend it. */
  const [failed, setFailed] = useState<{ text: string; count: number } | null>(null);

  async function ask(text: string, draft: Draft): Promise<void> {
    setBusy(true);
    setRateLimited(false);
    const { facts, answered, asked } = progress;
    const outcome = await postIntake({ message: text, facts, answered, asked, lang });
    setBusy(false);
    if (outcome.kind === 'rateLimited') return setRateLimited(true);
    if (outcome.kind === 'failed') {
      const count = (failed?.count ?? 0) + 1;
      if (count >= FAILURES_BEFORE_FORM) return onFallback();
      return setFailed({ text, count });
    }
    setFailed(null);
    const next = nextProgress(progress, outcome.value);
    setProgress(next);
    setSymptom((s) => s || outcome.value.symptomNotice);
    setLines((l) => [...l, replyLine(outcome.value, next)]);
    onChange(applyFacts(draft, next.facts, appConfig));
  }

  async function send(message: string, draft: Draft): Promise<void> {
    const text = message.trim();
    if (!text || busy) return;
    setFailed(null);
    setLines((l) => [...l, { role: 'user', text }]);
    await ask(text, draft);
  }

  const retry = (draft: Draft) => (failed && !busy ? ask(failed.text, draft) : Promise.resolve());
  return { progress, lines, busy, rateLimited, symptom, failed: failed !== null, send, retry };
}
