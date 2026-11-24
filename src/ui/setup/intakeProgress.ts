import { fieldsIn, type IntakeFacts, type IntakeField, type IntakeResponse } from '@/domain';
import { mergeFacts } from '@/engine/intakeMerge';

/** Where the conversation stands. */
export interface IntakeProgress {
  facts: IntakeFacts;
  answered: IntakeField[];
  /** Follow-up questions asked so far (FR-1 caps this at 6 on the server). */
  asked: number;
  /** The topic the last question asked about. */
  pending: IntakeField | null;
  done: boolean;
}

export const INITIAL_PROGRESS: IntakeProgress = {
  facts: {},
  answered: [],
  asked: 0,
  pending: null,
  done: false,
};

/**
 * After a reply: merge the facts, and count a topic as answered once the user has replied to
 * its question, even with "don't know", so the same question is never asked twice.
 */
export function nextProgress(p: IntakeProgress, reply: IntakeResponse): IntakeProgress {
  const covered = [
    ...p.answered,
    ...fieldsIn(reply.profileDelta),
    ...(p.pending ? [p.pending] : []),
  ];
  const pending = reply.nextField === 'done' ? null : reply.nextField;
  return {
    facts: mergeFacts(p.facts, reply.profileDelta),
    answered: [...new Set(covered)],
    asked: p.asked + 1,
    pending,
    done: pending === null,
  };
}
