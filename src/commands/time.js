import { heading, table, note, muted, accent, bold } from "../lib/ui.js";
import { formatNumber, isoLocal } from "../lib/format.js";
import { UserError, toInteger } from "../lib/args.js";
import {
  parseDateInput,
  calendarDifference,
  dayDifference,
  nextBirthday,
  humanRemaining,
  weekdayCount,
  monthName,
} from "../lib/dates.js";
import { textFromArgs, fromInput } from "./helpers.js";

function isoWeek(date) {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil(((value - yearStart) / 86400000 + 1) / 7);
}

function dateFromArg(args, ctx, usage) {
  return parseDateInput(textFromArgs(args, ctx, usage));
}

export const timeCommands = [
  {
    id: "now",
    category: "Waktu",
    summary: "Waktu sekarang dalam epoch, ISO, UTC, dan zona waktu lokal.",
    usage: "iky now",
    fields: [],
    async run(_input, ctx) {
      const now = new Date();
      ctx.out(heading("Waktu sekarang"));
      ctx.out(
        table(
          ["Format", "Nilai"],
          [
            ["Lokal", now.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" })],
            ["ISO lokal", isoLocal(now)],
            ["ISO UTC", now.toISOString()],
            ["Epoch detik", String(Math.floor(now.getTime() / 1000))],
            ["Epoch milidetik", String(now.getTime())],
            ["Zona waktu", Intl.DateTimeFormat().resolvedOptions().timeZone],
            ["Minggu ISO", String(isoWeek(now))],
          ],
          { maxWidth: 56 },
        ),
      );
    },
  },
  {
    id: "time",
    category: "Waktu",
    summary: "Konversi epoch atau tanggal menjadi beberapa format sekaligus.",
    usage: 'iky time "2026-10-20" | iky time 1700000000',
    fields: [{ key: "value", label: "Tanggal atau epoch", type: "text", required: true }],
    parse(args, ctx) {
      return { value: textFromArgs(args, ctx, 'iky time "2026-10-20"') };
    },
    async run(input, ctx) {
      const raw = fromInput(input, "value", ctx, "iky time");
      const date = parseDateInput(raw);
      const isEpoch = /^\d{10}$|^\d{13}$/.test(raw.trim());
      ctx.out(heading(isEpoch ? `Epoch ${raw}` : "Konversi waktu"));
      ctx.out(
        table(
          ["Format", "Nilai"],
          [
            ["Lokal", date.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" })],
            ["ISO UTC", date.toISOString()],
            ["ISO lokal", isoLocal(date)],
            ["Epoch detik", String(Math.floor(date.getTime() / 1000))],
            ["Epoch milidetik", String(date.getTime())],
            ["Hari", date.toLocaleDateString("id-ID", { weekday: "long" })],
            ["Minggu ISO", String(isoWeek(date))],
          ],
          { maxWidth: 56 },
        ),
      );
      if (!/^\d{10}$|^\d{13}$/.test(raw.trim()) && !/T/.test(raw)) {
        ctx.out(note("Tanggal tanpa jam dianggap mulai pukul 00:00 waktu lokal."));
      }
    },
  },
  {
    id: "datediff",
    category: "Waktu",
    summary: "Selisih dua tanggal dalam hari, minggu, bulan, dan hari kerja.",
    usage: 'iky datediff "2026-01-01" "2026-12-31"',
    fields: [
      { key: "start", label: "Tanggal awal", type: "text", required: true, default: "hari ini" },
      { key: "end", label: "Tanggal akhir", type: "text", required: true, default: "hari ini" },
    ],
    parse(args) {
      if (args.length < 2) throw new UserError("Butuh dua tanggal.", 'iky datediff "awal" "akhir"');
      return { start: args[0], end: args[1] };
    },
    async run(input, ctx) {
      const start = parseDateInput(fromInput(input, "start", ctx, "iky datediff"));
      const end = parseDateInput(fromInput(input, "end", ctx, "iky datediff"));
      const total = Math.abs(dayDifference(start, end));
      const diff = calendarDifference(start, end);
      const business = weekdayCount(start, end);
      ctx.out(heading("Selisih tanggal"));
      ctx.out(
        table(
          ["Ukuran", "Nilai"],
          [
            ["Dari", start.toLocaleDateString("id-ID", { dateStyle: "full" })],
            ["Sampai", end.toLocaleDateString("id-ID", { dateStyle: "full" })],
            ["Total hari", formatNumber(total)],
            ["Minggu", `${Math.floor(total / 7)} minggu ${total % 7} hari`],
            ["Kalender", `${diff.years} tahun, ${diff.months} bulan, ${diff.days} hari`],
            ["Hari kerja", formatNumber(business)],
          ],
          { maxWidth: 56 },
        ),
      );
      ctx.out(note("Hari kerja dihitung Senin sampai Jumat, termasuk tanggal awal dan akhir."));
    },
  },
  {
    id: "age",
    category: "Waktu",
    summary: "Hitung usia, total hari, dan ulang tahun berikutnya.",
    usage: 'iky age "2000-05-17"',
    fields: [
      { key: "birth", label: "Tanggal lahir", type: "text", required: true },
      { key: "reference", label: "Sampai tanggal", type: "text", required: false, default: "hari ini" },
    ],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan tanggal lahir.", 'iky age "2000-05-17"');
      return { birth: args[0], reference: args[1] ?? "hari ini" };
    },
    async run(input, ctx) {
      const birth = parseDateInput(fromInput(input, "birth", ctx, "iky age"));
      const reference = parseDateInput(input.reference || "hari ini");
      if (birth > reference) throw new UserError("Tanggal lahir tidak boleh melewati tanggal acuan.");
      const age = calendarDifference(birth, reference);
      const totalDays = dayDifference(birth, reference);
      const next = nextBirthday(birth, reference);
      const daysToNext = dayDifference(reference, next);
      ctx.out(heading("Usia"));
      ctx.out(
        table(
          ["Ukuran", "Nilai"],
          [
            ["Lahir", birth.toLocaleDateString("id-ID", { dateStyle: "full" })],
            ["Usia", `${age.years} tahun, ${age.months} bulan, ${age.days} hari`],
            ["Total hari", formatNumber(totalDays)],
            ["Hari lahir", birth.toLocaleDateString("id-ID", { weekday: "long" })],
            ["Ulang tahun", next.toLocaleDateString("id-ID", { dateStyle: "full" })],
            ["Menuju ulang tahun", daysToNext === 0 ? "Hari ini" : `${daysToNext} hari`],
          ],
          { maxWidth: 58 },
        ),
      );
    },
  },
  {
    id: "countdown",
    category: "Waktu",
    summary: "Hitung sisa waktu menuju tanggal, atau waktu yang sudah lewat.",
    usage: 'iky countdown "2027-01-01"',
    fields: [{ key: "target", label: "Tanggal target", type: "text", required: true }],
    parse(args, ctx) {
      return { target: textFromArgs(args, ctx, 'iky countdown "2027-01-01"') };
    },
    async run(input, ctx) {
      const target = parseDateInput(fromInput(input, "target", ctx, "iky countdown"));
      const now = new Date();
      const difference = target.getTime() - now.getTime();
      const label = difference >= 0 ? "Menuju" : "Sudah lewat";
      ctx.out(heading("Hitung mundur"));
      ctx.out(
        table(
          ["Field", "Nilai"],
          [
            ["Target", target.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" })],
            ["Sekarang", now.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" })],
            [label, humanRemaining(difference)],
            ["Total jam", formatNumber(Math.abs(difference) / 3600000, "id-ID", 2)],
            ["Total hari", formatNumber(Math.abs(difference) / 86400000, "id-ID", 2)],
          ],
          { maxWidth: 58 },
        ),
      );
    },
  },
  {
    id: "calendar",
    category: "Waktu",
    summary: "Tampilkan kalender satu bulan dengan penanda hari ini.",
    usage: "iky calendar [bulan] [tahun]",
    fields: [
      { key: "month", label: "Bulan (1-12)", type: "number", required: false },
      { key: "year", label: "Tahun", type: "number", required: false },
    ],
    parse(args) {
      if (!args.length) return {};
      const monthYear = args[0].match(/^(\d{4})-(\d{1,2})$/);
      if (monthYear) return { year: toInteger(monthYear[1], "Tahun"), month: toInteger(monthYear[2], "Bulan") };
      if (args.length === 1) return { month: toInteger(args[0], "Bulan") };
      return { month: toInteger(args[0], "Bulan"), year: toInteger(args[1], "Tahun") };
    },
    async run(input, ctx) {
      const now = new Date();
      const month = input.month === undefined ? now.getMonth() + 1 : toInteger(input.month, "Bulan");
      const year = input.year === undefined ? now.getFullYear() : toInteger(input.year, "Tahun");
      if (month < 1 || month > 12) throw new UserError("Bulan harus antara 1 dan 12.");
      if (year < 1 || year > 9999) throw new UserError("Tahun harus antara 1 dan 9999.");
      const first = new Date(year, month - 1, 1);
      const days = new Date(year, month, 0).getDate();
      const offset = (first.getDay() + 6) % 7;
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
      ctx.out(heading(`${monthName(month - 1)} ${year}`));
      ctx.out(muted("Sen Sel Rab Kam Jum Sab Min"));
      let row = "    ".repeat(offset);
      for (let day = 1; day <= days; day += 1) {
        const isToday = isCurrentMonth && today.getDate() === day;
        row += isToday ? accent(`[${String(day).padStart(2)}]`) : ` ${String(day).padStart(2)} `;
        if ((offset + day) % 7 === 0) {
          ctx.out(row.trimEnd());
          row = "";
        }
      }
      if (row.trim()) ctx.out(row.trimEnd());
      ctx.out("");
      ctx.out(muted(`${days} hari · awal bulan ${first.toLocaleDateString("id-ID", { weekday: "long" })}`));
    },
  },
];
