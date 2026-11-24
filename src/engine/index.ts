/** engine/: pure, tested functions that compute every number the app shows. */
export {
  FORECAST_VIEW_DAYS,
  forecastPeak,
  groupForecastByDay,
  localDate,
  type DayHour,
  type ForecastDay,
} from './forecastDays';
export { minutesSince } from './time';
export { simulateRoom, steadyState, type RoomHourly } from './indoor';
export { buildTimeline, inHourRange, type Timeline } from './timeline';
export { evaluateAction, evaluateScenario, totalInhaled } from './tula';
export { isApplicable, rankActions, scoreWeights, withinBudget, type RankedAction } from './rank';
export { displayTula, roundTo, type DisplayTula } from './display';
