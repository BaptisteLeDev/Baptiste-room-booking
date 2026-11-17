import { component$ } from "@builder.io/qwik";
import type { ReservationStatus, TimelineDay } from "@room-booking/core";
import { RESERVATION_STATUS_LABELS } from "~/components/ui/badge";

const SERIES: { key: ReservationStatus; fill: string }[] = [
  { key: "PENDING_PAYMENT", fill: "fill-(--color-status-pending-text)" },
  { key: "CONFIRMED", fill: "fill-(--color-status-confirmed-text)" },
  { key: "REFUSED", fill: "fill-(--color-status-rejected-text)" },
  { key: "CANCELLED", fill: "fill-(--color-status-cancelled-text)" },
  { key: "COMPLETED", fill: "fill-(--color-status-completed-text)" },
];

const BAR = 24;
const GAP = 8;
const HEIGHT = 180;

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

export const TimelineChart = component$<{ days: TimelineDay[] }>(({ days }) => {
  if (days.length === 0) {
    return (
      <p class="text-(--color-text-muted)">
        Aucune réservation sur la période.
      </p>
    );
  }
  const max = Math.max(1, ...days.map((d) => d.total));
  const width = days.length * (BAR + GAP);
  return (
    <div class="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT + 20}`}
        class="h-auto min-w-full"
        role="img"
        aria-label={`Réservations par jour, ${days.length} jours`}
      >
        {days.map((day, i) => {
          let y = HEIGHT;
          return (
            <g key={day.date} transform={`translate(${i * (BAR + GAP)} 0)`}>
              {SERIES.map(({ key, fill }) => {
                const h = (day.byStatus[key] / max) * HEIGHT;
                y -= h;
                return h > 0 ? (
                  <rect
                    key={key}
                    x="0"
                    y={y}
                    width={BAR}
                    height={h}
                    class={fill}
                  >
                    <title>{`${shortDate(day.date)} · ${RESERVATION_STATUS_LABELS[key]} : ${day.byStatus[key]}`}</title>
                  </rect>
                ) : null;
              })}
              <text
                x={BAR / 2}
                y={HEIGHT + 16}
                text-anchor="middle"
                class="fill-(--color-text-muted) text-[10px]"
              >
                {shortDate(day.date)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul class="mt-(--space-3) flex flex-wrap gap-(--space-3) text-(length:--font-size-sm)">
        {SERIES.map(({ key, fill }) => (
          <li key={key} class="inline-flex items-center gap-(--space-1)">
            <span
              class={["inline-block size-3 rounded-sm bg-current", fill]}
              aria-hidden="true"
            />
            {RESERVATION_STATUS_LABELS[key]}
          </li>
        ))}
      </ul>
    </div>
  );
});
