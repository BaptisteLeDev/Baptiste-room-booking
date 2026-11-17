import { component$, Slot } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { requireRole } from "~/lib/auth.server";
import { ADMIN_ROLES } from "~/lib/navigation";

export const onRequest: RequestHandler = (event) => {
  requireRole(event, ADMIN_ROLES);
};

export default component$(() => <Slot />);
