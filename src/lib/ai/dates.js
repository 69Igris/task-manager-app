/**
 * Calendar-date helpers. TaskForge stores due dates the way the task form
 * sends them: a date-only string ("YYYY-MM-DD") parsed to UTC midnight. These
 * helpers keep that convention and resolve "today" in the configured timezone
 * so relative dates never depend on the model's arithmetic.
 */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date (YYYY-MM-DD) in `timeZone`. */
export function todayIn(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). */
export function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);
}

export function weekdayOf(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/** Calendar date of a stored due date (stored as UTC midnight). */
export function dueDateToIso(dueDate) {
  if (!dueDate) return null;
  const d = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** The Date value to store for a calendar date, matching the task form. */
export function isoToDueDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`);
}

/**
 * Resolve a due-date expression to YYYY-MM-DD relative to `today`.
 * Supported: ISO dates, today, tomorrow, <weekday> (next occurrence, today
 * included), next <weekday> (that weekday in the following Mon–Sun week),
 * in N day(s)/week(s), end of week (Friday), end of month.
 * Returns { date } or { error }.
 */
export function resolveDueDate(expression, today) {
  if (expression === undefined || expression === null) return { date: null };
  const raw = String(expression).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!raw) return { date: null };

  if (ISO_DATE.test(raw)) {
    return isValidIsoDate(raw) ? { date: raw } : { error: `"${expression}" is not a real calendar date` };
  }
  if (raw === 'today') return { date: today };
  if (raw === 'tomorrow') return { date: addDays(today, 1) };

  const todayDow = weekdayOf(today);
  const plain = raw.replace(/^(by|on|this) /, '');
  const dayIdx = WEEKDAYS.indexOf(plain);
  if (dayIdx !== -1) {
    return { date: addDays(today, (dayIdx - todayDow + 7) % 7) };
  }

  const next = raw.match(/^next (\w+)$/);
  if (next) {
    if (next[1] === 'week') return { date: addDays(today, 7) };
    const idx = WEEKDAYS.indexOf(next[1]);
    if (idx !== -1) {
      // Monday-based weeks: jump to next week's Monday, then to the weekday.
      const daysToNextMonday = ((1 - todayDow + 7) % 7) || 7;
      const nextMonday = addDays(today, daysToNextMonday);
      return { date: addDays(nextMonday, (idx + 6) % 7) };
    }
  }

  const rel = raw.match(/^in (\d{1,3}) (day|days|week|weeks)$/);
  if (rel) {
    const n = Number(rel[1]);
    return { date: addDays(today, rel[2].startsWith('week') ? n * 7 : n) };
  }

  if (raw === 'end of week' || raw === 'end of the week') {
    return { date: addDays(today, (5 - todayDow + 7) % 7) };
  }
  if (raw === 'end of month' || raw === 'end of the month') {
    const d = new Date(`${today}T00:00:00Z`);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return { date: last.toISOString().slice(0, 10) };
  }

  return { error: `Could not interpret due date "${expression}". Use YYYY-MM-DD or a phrase like "friday", "next monday", "in 3 days".` };
}
