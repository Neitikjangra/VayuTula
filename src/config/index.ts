import * as z from 'zod/mini';
import {
  ActionDefSchema,
  CitationSchema,
  ConfigValueSchema,
  isProvisional,
  type ActionDef,
  type ConfigValue,
} from '@/domain';
import actionsJson from './actions.json';
import factorsJson from './factors.json';
import healthJson from './health-library.json';
import purifiersJson from './purifiers.json';
import rankingJson from './ranking.json';
import tariffsJson from './tariffs.json';

const PurifierSchema = z.object({
  id: z.string().check(z.regex(/^[a-z0-9-]+$/)),
  brand: z.string(),
  model: z.string(),
  cadr: ConfigValueSchema,
  watts: ConfigValueSchema,
  filterRupees: ConfigValueSchema,
  filterLifeMonths: ConfigValueSchema,
  priceRupees: ConfigValueSchema,
});
export type Purifier = z.infer<typeof PurifierSchema>;

const HealthStatementSchema = z.object({
  id: z.string(),
  en: z.string().check(z.minLength(1)),
  hi: z.string().check(z.minLength(1)),
  valueKey: z.optional(z.string()),
  citation: CitationSchema,
});
export type HealthStatement = z.infer<typeof HealthStatementSchema>;

export type Factors = typeof factorsJson;
export type Tariffs = typeof tariffsJson;
export type Ranking = typeof rankingJson;

/** Everything the engine reads. Tests pass a modified copy to get hand-checkable numbers. */
export interface AppConfig {
  factors: Factors;
  tariffs: Tariffs;
  ranking: Ranking;
  purifiers: Purifier[];
  actions: ActionDef[];
}

function isValueShape(node: unknown): node is Record<string, unknown> {
  return typeof node === 'object' && node !== null && 'value' in node && 'unit' in node;
}

/** Walks nested objects and returns every config value keyed by its dotted path. */
export function collectValues(node: unknown, prefix: string, out = new Map<string, ConfigValue>()) {
  if (isValueShape(node)) {
    out.set(prefix, ConfigValueSchema.parse(node));
  } else if (typeof node === 'object' && node !== null) {
    for (const [key, child] of Object.entries(node)) collectValues(child, `${prefix}.${key}`, out);
  }
  return out;
}

const purifiers = z.array(PurifierSchema).parse(purifiersJson.models);
const actions = z.array(ActionDefSchema).parse(actionsJson.actions);
export const healthStatements = z.array(HealthStatementSchema).parse(healthJson.statements);
export const healthValues = healthJson.values;

function buildRegistry(): Map<string, ConfigValue> {
  const registry = new Map<string, ConfigValue>();
  collectValues(factorsJson, 'factors', registry);
  collectValues(tariffsJson, 'tariffs', registry);
  collectValues(rankingJson, 'ranking', registry);
  collectValues(healthJson.values, 'health', registry);
  for (const p of purifiers) collectValues(p, `purifiers.${p.id}`, registry);
  for (const a of actions) registry.set(`actions.${a.id}.oneOffRupees`, a.oneOffRupees);
  return registry;
}

/** Every config value by key, e.g. "factors.airExchange.leaky". */
export const configRegistry: ReadonlyMap<string, ConfigValue> = buildRegistry();

/** True if the key is unknown or its value is unverified; unknown keys never look final. */
export function isKeyProvisional(key: string): boolean {
  const entry = configRegistry.get(key);
  return entry === undefined || isProvisional(entry);
}

export const appConfig: AppConfig = {
  factors: factorsJson,
  tariffs: tariffsJson,
  ranking: rankingJson,
  purifiers,
  actions,
};
