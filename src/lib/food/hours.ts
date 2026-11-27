import type { OpeningHours } from "../data/schema";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Day + minutes-since-midnight in Asia/Ho_Chi_Minh (UTC+7, no DST). */
export function hcmcClock(date: Date): { day: (typeof DAYS)[number]; minutes: number } {
  const t = new Date(date.getTime() + 7 * 3600_000);
  return { day: DAYS[t.getUTCDay()], minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** True if open at `date` (HCMC time). Unknown hours → null. Supports ranges past midnight. */
export function isOpenAt(hours: OpeningHours | undefined, date: Date): boolean | null {
  if (!hours) return null;
  const { day, minutes } = hcmcClock(date);
  const prev = DAYS[(DAYS.indexOf(day) + 6) % 7];
  const today = hours[day].some(([o, c]) => {
    const [a, b] = [toMin(o), toMin(c)];
    return b > a ? minutes >= a && minutes < b : minutes >= a; // b<=a: closes after midnight
  });
  const spill = hours[prev].some(([o, c]) => toMin(c) <= toMin(o) && minutes < toMin(c));
  return today || spill;
}

/** Whether the venue is open during a time-of-day slot on any day. */
export function opensDuring(hours: OpeningHours | undefined, slot: "morning" | "midday" | "evening" | "late-night"): boolean | null {
  if (!hours) return null;
  const ranges = { morning: [360, 600], midday: [660, 840], evening: [1080, 1260], "late-night": [1320, 1439] }[slot];
  return DAYS.some((d) =>
    hours[d].some(([o, c]) => {
      const a = toMin(o);
      const b = toMin(c) <= a ? 1440 : toMin(c);
      return a < ranges[1] && b > ranges[0];
    }),
  );
}
