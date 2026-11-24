'use client';

import { useState } from 'react';
import { appConfig } from '@/config';
import type { NextField } from '@/domain';
import { applyFacts } from '@/engine/intakeMerge';
import type { Lang } from '@/i18n';
import type { Draft } from './draft';
import { postIntake } from './intakeClient';
import { INITIAL_PROGRESS, nextProgress, type IntakeProgress } from './intakeProgress';

/** A chat line. Assistant lines with text null show the built-in question for `field`. */
export type ChatLine =
  { role: 'user'; text: string } | { role: 'assistant'; text: string | null; field: NextField };

interface Handlers {
  onChange: (draft: Draft) => void;
  onFallback: () => void;
}

/** FR-1 conversation state: sends a turn, merges facts into the draft, falls back on failure. */
export function useIntake(lang: Lang, { onChange, onFallback }: Handlers) {
  const [progress, setProgress] = useState<IntakeProgress>(INITIAL_PROGRESS);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [symptom, setSymptom] = useState(false);

  async function send(message: string, draft: Draft): Promise<void> {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setRateLimited(false);
    setLines((l) => [...l, { role: 'user', text }]);
    const { facts, answered, asked } = progress;
    const outcome = await postIntake({ message: text, facts, answered, asked, lang });
    setBusy(false);
    if (outcome.kind === 'rateLimited') return setRateLimited(true);
    if (outcome.kind === 'failed') return onFallback();
    const reply = outcome.value;
    const next = nextProgress(progress, reply);
    setProgress(next);
    setSymptom((s) => s || reply.symptomNotice);
    setLines((l) => [...l, { role: 'assistant', text: reply.question, field: reply.nextField }]);
    onChange(applyFacts(draft, next.facts, appConfig));
  }

  return { progress, lines, busy, rateLimited, symptom, send };
}
