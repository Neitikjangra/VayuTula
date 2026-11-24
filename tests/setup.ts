// Unit tests render Hindi synchronously, so load its strings once before any test runs.
import { loadLang } from '@/i18n';

await loadLang('hi');
