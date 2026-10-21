export function parseDateInput(input, options = {}) {
  const text = String(input ?? "").trim();
  if (!text || text.toLowerCase() === "sekarang" || text.toLowerCase() === "now") {
    return new Date();
  }
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower === "hari ini" || lower === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (lower === "besok" || lower === "tomorrow") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  if (lower === "kemarin" || lower === "yesterday") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  }
  if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000);
  if (/^\d{13}$/.test(text)) return new Date(Number(text));
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const localDateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localDateTime) {
    return new Date(
      Number(localDateTime[1]),
      Number(localDateTime[2]) - 1,
      Number(localDateTime[3]),
      Number(localDateTime[4]),
      Number(localDateTime[5]),
      Number(localDateTime[6] ?? 0),
    );
  }
  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dayFirst) {
    return new Date(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1]));
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Tanggal tidak dikenal: ${input}. Contoh: 2026-10-20 atau 20/10/2026.`);
  }
  return parsed;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayDifference(from, to) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

export function calendarDifference(from, to) {
  let start = startOfDay(from);
  let end = startOfDay(to);
  const sign = end < start ? -1 : 1;
  if (sign < 0) [start, end] = [end, start];
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    const previousMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += previousMonthDays;
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { sign, years, months, days };
}

export function ageOn(birth, reference = new Date()) {
  return calendarDifference(birth, reference);
}

export function nextBirthday(birth, reference = new Date()) {
  const today = startOfDay(reference);
  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  return next;
}

export function weekdayCount(from, to, weekdays = [1, 2, 3, 4, 5]) {
  const start = startOfDay(from);
  const end = startOfDay(to);
  const direction = end < start ? -1 : 1;
  const cursor = new Date(start);
  let count = 0;
  const allowed = new Set(weekdays);
  while ((direction > 0 ? cursor <= end : cursor >= end)) {
    if (allowed.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + direction);
  }
  return count;
}

export function humanRemaining(milliseconds) {
  const absolute = Math.abs(milliseconds);
  const days = Math.floor(absolute / 86400000);
  const hours = Math.floor((absolute % 86400000) / 3600000);
  const minutes = Math.floor((absolute % 3600000) / 60000);
  const seconds = Math.floor((absolute % 60000) / 1000);
  const parts = [];
  if (days) parts.push(`${days} hari`);
  if (hours) parts.push(`${hours} jam`);
  if (minutes) parts.push(`${minutes} menit`);
  if (!days && !hours) parts.push(`${seconds} detik`);
  return parts.join(" ");
}

export function monthName(month, locale = "id-ID") {
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, month, 1));
}
