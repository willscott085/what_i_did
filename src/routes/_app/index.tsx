import { createFileRoute, redirect } from "@tanstack/react-router";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/")({
  beforeLoad: () => {
    const today = format(new Date(), "yyyy-MM-dd");
    throw redirect({ to: "/day/$date", params: { date: today } });
  },
});
