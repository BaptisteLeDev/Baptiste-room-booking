import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  getAdminStatistics,
  getAdminTimeline,
  type Statistics,
} from "@room-booking/core";
import { TimelineChart } from "~/components/admin/timeline-chart";
import { Alert } from "~/components/ui/alert";
import { ButtonLink, Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";
import { api } from "~/lib/api/client.server";
import { requireRole } from "~/lib/auth.server";
import { formatAmount } from "~/lib/format";
import { ADMIN_ROLES } from "~/lib/navigation";
import { isoDate } from "~/lib/url-params";

export const useOverview = routeLoader$(async (event) => {
  requireRole(event, ADMIN_ROLES);
  const query = {
    from: isoDate(event.url.searchParams.get("from")),
    to: isoDate(event.url.searchParams.get("to")),
  };
  const client = api(event);
  const [stats, timeline] = await Promise.all([
    getAdminStatistics({ client, query }),
    getAdminTimeline({ client, query }),
  ]);
  if (!stats.data || !timeline.data) return { failed: true as const, query };
  return {
    failed: false as const,
    query,
    stats: stats.data,
    days: timeline.data.days,
  };
});

const TILES: { key: keyof Statistics; label: string; money?: boolean }[] = [
  { key: "totalReservations", label: "Réservations" },
  { key: "confirmedReservations", label: "Confirmées" },
  { key: "cancelledReservations", label: "Annulées" },
  { key: "totalRevenue", label: "Revenu", money: true },
  { key: "totalUsers", label: "Utilisateurs" },
  { key: "totalRooms", label: "Salles" },
];

export default component$(() => {
  const overview = useOverview();
  const value = overview.value;
  return (
    <>
      <PageHeader
        title="Administration"
        description="Vue d'ensemble de la plateforme."
      >
        <ButtonLink href="/admin/reservations/" variant="secondary">
          Gérer les réservations
        </ButtonLink>
      </PageHeader>

      <form
        method="get"
        class="mb-(--space-5) flex flex-wrap items-end gap-(--space-3)"
      >
        <label class="flex flex-col gap-(--space-1) text-(length:--font-size-sm)">
          Du
          <input
            type="date"
            name="from"
            value={value?.query.from}
            class="rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface) px-(--space-2) py-(--space-1)"
          />
        </label>
        <label class="flex flex-col gap-(--space-1) text-(length:--font-size-sm)">
          Au
          <input
            type="date"
            name="to"
            value={value?.query.to}
            class="rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface) px-(--space-2) py-(--space-1)"
          />
        </label>
        <Button type="submit" variant="secondary" size="sm">
          Appliquer
        </Button>
      </form>

      {value?.failed && (
        <Alert
          tone="danger"
          title="Statistiques indisponibles. Vérifiez la période (début avant fin)."
        />
      )}

      {value && !value.failed && (
        <>
          <dl class="mb-(--space-5) grid grid-cols-2 gap-(--space-3) md:grid-cols-3">
            {TILES.map(({ key, label, money }) => (
              <div
                key={key}
                class="rounded-(--radius-lg) border border-(--color-border) bg-(--color-surface) p-(--space-4)"
              >
                <dt class="text-(length:--font-size-sm) text-(--color-text-muted)">
                  {label}
                </dt>
                <dd class="text-(length:--font-size-xl) font-(--font-weight-bold)">
                  {money ? formatAmount(value.stats[key]) : value.stats[key]}
                </dd>
              </div>
            ))}
          </dl>
          <section class="rounded-(--radius-lg) border border-(--color-border) bg-(--color-surface) p-(--space-4) md:p-(--space-5)">
            <h2 class="mb-(--space-3) text-(length:--font-size-lg)">
              Réservations par jour et par état
            </h2>
            <TimelineChart days={value.days} />
          </section>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: "Administration · Quorum",
};
