export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export function computeNextRunDate(current: Date, frequency: Frequency): Date {
  const d = new Date(current);
  if (frequency === "DAILY") {
    d.setDate(d.getDate() + 1);
  } else if (frequency === "WEEKLY") {
    d.setDate(d.getDate() + 7);
  } else if (frequency === "MONTHLY") {
    d.setMonth(d.getMonth() + 1);
  } else if (frequency === "YEARLY") {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

export function listUpcomingOccurrences(
  startDate: Date,
  frequency: Frequency,
  until: Date,
  endDate?: Date | null,
): Date[] {
  const out: Date[] = [];
  let cur = new Date(startDate);
  const hardStop = endDate ? new Date(Math.min(until.getTime(), endDate.getTime())) : until;
  let guard = 0;
  while (cur.getTime() <= hardStop.getTime() && guard < 400) {
    out.push(new Date(cur));
    cur = computeNextRunDate(cur, frequency);
    guard++;
  }
  return out;
}
