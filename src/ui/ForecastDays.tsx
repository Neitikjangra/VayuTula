'use client';

import { useId } from 'react';
import type { Forecast } from '@/domain';
import { forecastPeak, groupForecastByDay, type ForecastDay } from '@/engine';
import { format, type Lang } from '@/i18n';
import { formatDay, formatHour, formatNumber } from './format';

const BAR_MAX_PX = 48;

function barHeight(value: number, peak: number): string {
  return `${Math.max(2, Math.round((value / Math.max(peak, 1)) * BAR_MAX_PX))}px`;
}

interface DayProps {
  day: ForecastDay;
  peak: number;
  timeZone: string;
  lang: Lang;
}

function DayRow({ day, peak, timeZone, lang }: DayProps) {
  const headingId = useId();
  const dayLabel = formatDay(day.date, lang);
  const range = { min: formatNumber(day.min, lang), max: formatNumber(day.max, lang) };
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h4
        id={headingId}
        className="flex flex-wrap items-baseline justify-between gap-2 text-base font-semibold text-slate-900"
      >
        <span>{dayLabel}</span>
        <span className="font-normal text-slate-700">
          {format(lang, 'forecast.dayRange', range)}
        </span>
      </h4>
      <div
        role="region"
        tabIndex={0}
        aria-label={format(lang, 'forecast.hourlyLabel', { day: dayLabel })}
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white"
      >
        <ol className="flex gap-1 p-2">
          {day.hours.map((hour) => (
            <li key={hour.time} className="flex w-11 shrink-0 flex-col items-center gap-1 text-xs">
              <span className="text-slate-700">{formatHour(hour.time, timeZone, lang)}</span>
              <span aria-hidden="true" className="flex h-12 items-end">
                <span
                  className="block w-3 rounded-t bg-sky-700"
                  style={{ height: barHeight(hour.pm25, peak) }}
                />
              </span>
              <span className="font-semibold text-slate-900">{formatNumber(hour.pm25, lang)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Four days of hourly outdoor PM2.5, values in text with bars as decoration only. */
export function ForecastDays({ forecast, lang }: { forecast: Forecast; lang: Lang }) {
  const days = groupForecastByDay(forecast);
  const peak = forecastPeak(days);
  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <DayRow key={day.date} day={day} peak={peak} timeZone={forecast.timezone} lang={lang} />
      ))}
    </div>
  );
}
