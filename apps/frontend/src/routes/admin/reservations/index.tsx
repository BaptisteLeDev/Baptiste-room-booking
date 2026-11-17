import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  z,
  zod$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  listAdminReservations,
  listUsers,
  setReservationStatus,
  type Reservation,
  type ReservationStatus,
} from "@room-booking/core";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { RESERVATION_STATUS_LABELS, StatusBadge } from "~/components/ui/badge";
import { Pagination } from "~/components/ui/pagination";
import { EmptyState, PageHeader } from "~/components/ui/page-header";
import { Select } from "~/components/ui/field";
import { api } from "~/lib/api/client.server";
import { roomsById, usersById } from "~/lib/api/rooms.server";
import { requireRole } from "~/lib/auth.server";
import { slotSentence } from "~/lib/bookings";
import { formatAmount } from "~/lib/format";
import { ADMIN_ROLES } from "~/lib/navigation";
import { reservationError } from "~/lib/reservation-errors";
import {
  RESERVATION_STATUSES,
  parseStatus,
  positiveInt,
} from "~/lib/url-params";

const PAGE_SIZE = 20;
const STATUS_VALUES = [...RESERVATION_STATUSES] as [
  ReservationStatus,
  ...ReservationStatus[],
];

const fullName = (user?: { firstName: string; lastName: string }) =>
  user ? `${user.firstName} ${user.lastName}` : "Utilisateur inconnu";

export const useAdminReservations = routeLoader$(async (event) => {
  requireRole(event, ADMIN_ROLES);
  const params = event.url.searchParams;
  const status = parseStatus(params.get("status"));
  const userId = z.string().uuid().safeParse(params.get("userId")).data;
  const page = positiveInt(params.get("page")) ?? 1;
  const client = api(event);
  const [result, clients] = await Promise.all([
    listAdminReservations({
      client,
      query: { status, userId, page, pageSize: PAGE_SIZE },
    }),
    listUsers({ client, query: { role: "CLIENT", pageSize: 100 } }),
  ]);
  if (!result.data || !clients.data) {
    return { failed: true as const, status, userId, page, clients: [] };
  }
  const reservations = result.data;
  const [rooms, users] = await Promise.all([
    roomsById(
      client,
      reservations.items.map((r) => r.roomId),
    ),
    usersById(
      client,
      reservations.items.map((r) => r.userId),
    ),
  ]);
  return {
    failed: false as const,
    status,
    userId,
    page,
    reservations,
    rooms,
    users,
    clients: clients.data.items,
  };
});

export const useSetStatus = routeAction$(
  async ({ reservationId, status }, event) => {
    requireRole(event, ADMIN_ROLES);
    const { error, response } = await setReservationStatus({
      client: api(event),
      path: { reservationId },
      body: { status },
    });
    if (error || !response?.ok) {
      const code = response?.status ?? 500;
      return event.fail(code, {
        message:
          code === 409
            ? "Transition refusée par la machine d'état."
            : reservationError(code),
      });
    }
    return { done: `État passé à ${RESERVATION_STATUS_LABELS[status]}.` };
  },
  zod$({
    reservationId: z.string().uuid(),
    status: z.enum(STATUS_VALUES),
  }),
);

export default component$(() => {
  const data = useAdminReservations();
  const setStatus = useSetStatus();
  const value = data.value;
  const feedback = setStatus.value;
  return (
    <>
      <PageHeader
        title="Réservations"
        description="Toutes les réservations, tous clients confondus."
      />

      <form
        method="get"
        class="mb-(--space-4) flex flex-wrap items-end gap-(--space-3)"
      >
        <label class="flex flex-col gap-(--space-1) text-(length:--font-size-sm)">
          Statut
          <Select name="status" value={value?.status ?? ""} class="min-w-40">
            <option value="">Tous</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {RESERVATION_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </label>
        <label class="flex flex-col gap-(--space-1) text-(length:--font-size-sm)">
          Client
          <Select name="userId" value={value?.userId ?? ""} class="min-w-56">
            <option value="">Tous les clients</option>
            {value?.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {fullName(c)}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary" size="sm">
          Filtrer
        </Button>
      </form>

      {feedback?.done && <Alert tone="success" title={feedback.done} />}
      {feedback?.message && <Alert tone="danger" title={feedback.message} />}
      {value?.failed && (
        <Alert tone="danger" title="Réservations indisponibles." />
      )}

      {value && !value.failed && value.reservations.items.length === 0 && (
        <EmptyState title="Aucune réservation" icon="calendar" />
      )}

      {value && !value.failed && value.reservations.items.length > 0 && (
        <>
          <ul class="flex flex-col gap-(--space-3)">
            {value.reservations.items.map((r: Reservation) => (
              <li
                key={r.id}
                class="rounded-(--radius-lg) border border-(--color-border) bg-(--color-surface) p-(--space-4)"
              >
                <div class="flex flex-wrap items-start justify-between gap-(--space-2)">
                  <div>
                    <p class="font-(--font-weight-semibold)">
                      {fullName(value.users[r.userId])}
                    </p>
                    <p class="text-(length:--font-size-sm) text-(--color-text-muted)">
                      {value.rooms[r.roomId]?.name ?? "Salle inconnue"} ·{" "}
                      {slotSentence(r)} · {formatAmount(r.totalAmount)}
                    </p>
                    <p class="font-mono text-(length:--font-size-xs) text-(--color-text-muted)">
                      {r.id}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <Form
                  action={setStatus}
                  class="mt-(--space-3) flex flex-wrap items-end gap-(--space-2)"
                >
                  <input type="hidden" name="reservationId" value={r.id} />
                  <label class="flex flex-col gap-(--space-1) text-(length:--font-size-sm)">
                    Nouvel état
                    <Select name="status" class="min-w-40">
                      {STATUS_VALUES.filter((s) => s !== r.status).map((s) => (
                        <option key={s} value={s}>
                          {RESERVATION_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <Button type="submit" variant="secondary" size="sm">
                    Appliquer
                  </Button>
                </Form>
              </li>
            ))}
          </ul>
          <div class="mt-(--space-4)">
            <Pagination
              page={value.reservations.page}
              pageSize={value.reservations.pageSize}
              total={value.reservations.total}
              query={`?${new URLSearchParams([
                ...(value.status ? [["status", value.status]] : []),
                ...(value.userId ? [["userId", value.userId]] : []),
              ]).toString()}`}
              noun="Réservations"
            />
          </div>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: "Réservations · Administration · Quorum",
};
