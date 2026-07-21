// Date helpers for the expenses (salary-cycle view) and subscriptions
// (auto-rolling next billing date) features.

// Rolls a subscription's next billing date forward past today, repeating by
// its billing cycle, so a date that's fallen into the past (e.g. the app
// wasn't opened for a couple of months) self-corrects to the next real due date.
export function getNextFutureBillingDate(dateStr: string, cycle: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
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
    return date.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

// Computes the [start, end] date range of the pay period containing today,
// given the day-of-month a user's salary lands on.
export function getSalaryCycleRange(salaryDay: number): { startStr: string; endStr: string } {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDate = today.getDate();

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
    startStr: startDate.toISOString().slice(0, 10),
    endStr: endDate.toISOString().slice(0, 10),
  };
}
