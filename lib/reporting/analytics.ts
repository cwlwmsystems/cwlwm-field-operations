import type {
  DemoAppointment,
  DemoInteraction,
  DemoLocation,
  DemoOrder,
  DemoRep,
  DemoSalesAttempt,
  DemoTerritory,
} from "@/lib/types/platform";

export type DateRangeKey = "7d" | "30d" | "90d" | "all";

export function startForRange(range: DateRangeKey, now = new Date()) {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const value = new Date(now);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - (days - 1));
  return value;
}

export function inRange(value: string | undefined, range: DateRangeKey, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = startForRange(range, now);
  return !start || date >= start;
}

export function filterAttempts(attempts: DemoSalesAttempt[], range: DateRangeKey) {
  return attempts.filter((item) => inRange(item.startedAt, range));
}

export function filterOrders(orders: DemoOrder[], range: DateRangeKey) {
  return orders.filter((item) => inRange(item.createdAt, range));
}

export function filterAppointments(appointments: DemoAppointment[], range: DateRangeKey) {
  if (range === "all") return appointments;
  const start = startForRange(range)!;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return appointments.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date >= start && date <= end;
  });
}

export function filterInteractions(interactions: DemoInteraction[], range: DateRangeKey) {
  return interactions.filter((item) => inRange(item.occurredAt, range));
}

export function pctValue(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : 0;
}

export function territoryMetrics(input: {
  territory: DemoTerritory;
  locations: DemoLocation[];
  attempts: DemoSalesAttempt[];
  orders: DemoOrder[];
  interactions: DemoInteraction[];
}) {
  const locations = input.locations.filter((l) => l.territoryId === input.territory.id);
  const ids = new Set(locations.map((l) => l.id));
  const prospects = locations.filter((l) => (l.serviceStatus ?? "prospect") === "prospect");
  const customers = locations.filter((l) => l.serviceStatus === "current_customer");
  const attempts = input.attempts.filter((a) => ids.has(a.locationId));
  const orders = input.orders.filter((o) => ids.has(o.locationId));
  const workedIds = new Set(input.interactions.filter((i) => ids.has(i.locationId)).map((i) => i.locationId));
  const unworkedProspects = prospects.filter((l) => !workedIds.has(l.id)).length;

  return {
    totalLocations: locations.length,
    prospects: prospects.length,
    customers: customers.length,
    attempts: attempts.length,
    orders: orders.length,
    conversion: pctValue(orders.length, attempts.length),
    penetration: pctValue(customers.length, customers.length + prospects.length),
    worked: workedIds.size,
    unworkedProspects,
  };
}

export function repMetrics(input: {
  rep: DemoRep;
  attempts: DemoSalesAttempt[];
  orders: DemoOrder[];
  appointments: DemoAppointment[];
  interactions: DemoInteraction[];
}) {
  const attempts = input.attempts.filter((a) => a.representativeId === input.rep.id);
  const orders = input.orders.filter((o) => o.representativeId === input.rep.id);
  const appointments = input.appointments.filter((a) => a.representativeId === input.rep.id);
  const interactions = input.interactions.filter((i) => i.representativeId === input.rep.id);
  const completed = appointments.filter((a) => a.status === "completed").length;

  return {
    attempts: attempts.length,
    orders: orders.length,
    conversion: pctValue(orders.length, attempts.length),
    appointments: appointments.length,
    appointmentCompletion: pctValue(completed, appointments.length),
    interactions: interactions.length,
    salesPer100Interactions: interactions.length ? (orders.length / interactions.length) * 100 : 0,
  };
}

export function buildDailySeries(input: {
  orders: DemoOrder[];
  attempts: DemoSalesAttempt[];
  days: number;
}) {
  const rows: { key: string; label: string; attempts: number; orders: number }[] = [];
  const now = new Date();
  for (let offset = input.days - 1; offset >= 0; offset--) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    rows.push({
      key,
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      attempts: 0,
      orders: 0,
    });
  }

  const map = new Map(rows.map((row) => [row.key, row]));
  for (const item of input.attempts) {
    const key = item.startedAt?.slice(0, 10);
    const row = key ? map.get(key) : undefined;
    if (row) row.attempts += 1;
  }
  for (const item of input.orders) {
    const key = item.createdAt?.slice(0, 10);
    const row = key ? map.get(key) : undefined;
    if (row) row.orders += 1;
  }
  return rows;
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
