// Date helpers for the expenses (salary-cycle view) and subscriptions
// (auto-rolling next billing date) features.

// `Date#toISOString()` converts to UTC first — for any timezone ahead of
// UTC (IST included), local midnight on a given day can serialize as the
// *previous* day once shifted to UTC (e.g. 00:00 IST on the 21st is 18:30
// UTC on the 20th). Every calendar date in this file is built from local
// Y/M/D components (`new Date(year, month, day)`), so it must be
// serialized the same way — reading those same local components back out —
// or the string silently drifts a day off from the Date it came from.
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Rolls a subscription's next billing date forward past today, repeating by
// its billing cycle, so a date that's fallen into the past (e.g. the app
// wasn't opened for a couple of months) self-corrects to the next real due date.
export function getNextFutureBillingDate(dateStr: string, cycle: string): string {
  if (!dateStr) return "";
  try {
    // A plain "YYYY-MM-DD" string parses as UTC midnight per the ISO 8601
    // spec, not local midnight — forcing a local time-of-day avoids that.
    const date = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(date.getTime())) return dateStr;
    while (date < today) {
      if (cycle === "monthly") {
        date.setMonth(date.getMonth() + 1);
      } else if (cycle === "yearly") {
        date.setFullYear(date.getFullYear() + 1);
      } else if (cycle === "weekly") {
        date.setDate(date.getDate() + 7);
      } else {
        break;
      }
    }
    return toLocalDateStr(date);
  } catch {
    return dateStr;
  }
}

// Computes the [start, end] date range of the pay period containing
// `referenceDate` (defaults to today), given the day-of-month a user's
// salary lands on.
export function getSalaryCycleRange(salaryDay: number, referenceDate: Date = new Date()): { startStr: string; endStr: string } {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-indexed
  const currentDate = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;

  if (currentDate >= salaryDay) {
    startDate = new Date(currentYear, currentMonth, salaryDay);
    endDate = new Date(currentYear, currentMonth + 1, salaryDay - 1);
  } else {
    startDate = new Date(currentYear, currentMonth - 1, salaryDay);
    endDate = new Date(currentYear, currentMonth, salaryDay - 1);
  }

  return {
    startStr: toLocalDateStr(startDate),
    endStr: toLocalDateStr(endDate),
  };
}

export interface SalaryLogEntry {
  date: string; // YYYY-MM-DD, when salary actually landed
  amount: number;
}

// A fixed day-of-month ("salary lands on the 25th") doesn't hold for
// paydays defined by business-day rules ("last working day before the
// 25th") — that date shifts month to month. `salaryDay` still gives a
// starting estimate for where a cycle boundary probably falls, but if the
// user has logged an actual payday within a week of that estimate, it's
// snapped to the logged date (and that cycle's logged amount) instead.
function snapToLoggedDate(estimatedStr: string, salaryLog: Record<string, SalaryLogEntry> | undefined): SalaryLogEntry | null {
  if (!salaryLog) return null;
  const estTime = new Date(`${estimatedStr}T00:00:00`).getTime();
  let best: SalaryLogEntry | null = null;
  let bestDiff = Infinity;
  for (const entry of Object.values(salaryLog)) {
    if (!entry?.date) continue;
    const diff = Math.abs(new Date(`${entry.date}T00:00:00`).getTime() - estTime);
    if (diff <= 7 * 86400000 && diff < bestDiff) {
      best = entry;
      bestDiff = diff;
    }
  }
  return best;
}

export interface ResolvedPayCycle {
  startStr: string;
  endStr: string;
  loggedAmount: number | null;
  prevStartStr: string;
  prevEndStr: string;
}

// Resolves the pay cycle containing `referenceDate`, preferring logged
// paydays over the fixed-day estimate wherever one exists nearby — for
// both this cycle and the one before it (for pace comparisons).
export function resolvePayCycle(
  salaryDay: number,
  salaryLog: Record<string, SalaryLogEntry> | undefined,
  referenceDate: Date = new Date()
): ResolvedPayCycle {
  const resolveStart = (refDate: Date) => {
    const estimated = getSalaryCycleRange(salaryDay, refDate);
    const snap = snapToLoggedDate(estimated.startStr, salaryLog);
    return { startStr: snap ? snap.date : estimated.startStr, loggedAmount: snap ? snap.amount : null, estimatedEndStr: estimated.endStr };
  };

  const current = resolveStart(referenceDate);

  // The end of this cycle is the day before the NEXT cycle's (possibly
  // logged) start.
  const dayAfterEstimatedEnd = new Date(`${current.estimatedEndStr}T00:00:00`);
  dayAfterEstimatedEnd.setDate(dayAfterEstimatedEnd.getDate() + 1);
  const next = resolveStart(dayAfterEstimatedEnd);
  const endDate = new Date(`${next.startStr}T00:00:00`);
  endDate.setDate(endDate.getDate() - 1);

  // The previous cycle's end is always the day before this cycle's
  // (resolved) start — cycles are contiguous by definition.
  const prevEndDate = new Date(`${current.startStr}T00:00:00`);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const previous = resolveStart(prevEndDate);

  return {
    startStr: current.startStr,
    endStr: toLocalDateStr(endDate),
    loggedAmount: current.loggedAmount,
    prevStartStr: previous.startStr,
    prevEndStr: toLocalDateStr(prevEndDate),
  };
}
