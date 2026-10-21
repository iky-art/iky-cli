import { heading, table, note, muted } from "../lib/ui.js";
import { formatNumber } from "../lib/format.js";
import { UserError, toNumber, toInteger, extractFlag, listFromArgs } from "../lib/args.js";
import { evaluate, formatMathResult } from "../lib/math.js";
import { convertUnit, detectUnitGroup, unitGroups } from "../lib/units.js";
import { textFromArgs, fromInput } from "./helpers.js";

const percentModes = [
  { value: "of", label: "x persen dari y" },
  { value: "change", label: "perubahan dari x ke y" },
  { value: "ratio", label: "x adalah berapa persen dari y" },
];

export const numberCommands = [
  {
    id: "calc",
    category: "Angka",
    summary: "Kalkulator ekspresi dengan fungsi matematika, tanpa eval.",
    usage: 'iky calc "2 * (3 + 4)"',
    fields: [{ key: "expression", label: "Ekspresi", type: "text", required: true }],
    parse(args, ctx) {
      return { expression: textFromArgs(args, ctx, 'iky calc "2 * (3 + 4)"') };
    },
    async run(input, ctx) {
      const expression = fromInput(input, "expression", ctx, "iky calc").trim();
      const result = evaluate(expression);
      ctx.out(`${expression} = ${formatMathResult(result)}`);
      if (/sin|cos|tan|asin|acos|atan/i.test(expression)) {
        ctx.out(note("Fungsi trigonometri memakai radian, bukan derajat."));
      }
      if (/[a-zA-Z]/.test(expression)) {
        ctx.out(muted("Konstanta: pi, e, tau. Fungsi: sqrt, abs, round, floor, ceil, log, min, max, pow."));
      }
    },
  },
  {
    id: "unit",
    category: "Angka",
    summary: "Konversi panjang, massa, suhu, dan ukuran data.",
    usage: "iky unit <nilai> <dari> <ke>",
    fields: [
      {
        key: "category",
        label: "Kategori",
        type: "select",
        choices: Object.keys(unitGroups).map((value) => ({ value, label: value })),
        required: true,
      },
      { key: "value", label: "Nilai", type: "decimal", required: true },
      { key: "from", label: "Dari satuan", type: "text", required: true },
      { key: "to", label: "Ke satuan", type: "text", required: true },
    ],
    parse(args) {
      const categories = Object.keys(unitGroups);
      const clean = [...args];
      if (categories.includes(clean[0]?.toLowerCase())) clean.shift();
      if (clean.length < 3) {
        throw new UserError("Butuh nilai, satuan asal, dan satuan tujuan.", "iky unit 10 km mi");
      }
      return { value: toNumber(clean[0], "Nilai"), from: clean[1], to: clean[2] };
    },
    async run(input, ctx) {
      const from = fromInput(input, "from", ctx, "iky unit");
      const to = fromInput(input, "to", ctx, "iky unit");
      const value = toNumber(input.value, "Nilai");
      if (input.category) {
        const group = detectUnitGroup(from);
        if (group !== input.category) {
          throw new UserError(`Satuan ${from} bukan bagian dari kategori ${input.category}.`);
        }
      }
      const result = convertUnit(value, from, to);
      ctx.out(`${formatNumber(value, "id-ID", 6)} ${from} = ${formatNumber(result, "id-ID", 6)} ${to}`);
      ctx.out(muted(`Kategori: ${detectUnitGroup(from)} · basis konversi satuan standar`));
    },
  },
  {
    id: "percent",
    category: "Angka",
    summary: "Hitung persentase, perubahan, dan rasio dengan langkah jelas.",
    usage: "iky percent <of|change|ratio> <x> <y>",
    fields: [
      { key: "mode", label: "Mode", type: "select", choices: percentModes, required: true },
      { key: "a", label: "Nilai pertama", type: "number", required: true },
      { key: "b", label: "Nilai kedua", type: "number", required: true },
    ],
    parse(args) {
      const mode = args[0]?.toLowerCase();
      if (!["of", "change", "ratio"].includes(mode)) {
        throw new UserError("Mode harus of, change, atau ratio.", "iky percent <mode> <x> <y>");
      }
      if (args.length < 3) throw new UserError("Butuh dua angka.", "iky percent <mode> <x> <y>");
      return { mode, a: toNumber(args[1], "Nilai pertama"), b: toNumber(args[2], "Nilai kedua") };
    },
    async run(input, ctx) {
      const a = toNumber(input.a, "Nilai pertama");
      const b = toNumber(input.b, "Nilai kedua");
      if (input.mode === "of") {
        ctx.out(`${formatNumber(a, "id-ID", 4)}% dari ${formatNumber(b, "id-ID", 4)} = ${formatNumber((a / 100) * b, "id-ID", 4)}`);
        ctx.out(muted(`${a} / 100 × ${b}`));
        return;
      }
      if (input.mode === "change") {
        if (a === 0) throw new UserError("Nilai awal tidak boleh nol untuk menghitung perubahan.");
        const change = ((b - a) / a) * 100;
        const direction = change > 0 ? "naik" : change < 0 ? "turun" : "tetap";
        ctx.out(`Dari ${formatNumber(a, "id-ID", 4)} ke ${formatNumber(b, "id-ID", 4)}: ${formatNumber(Math.abs(change), "id-ID", 4)}% ${direction}.`);
        ctx.out(muted(`((${b} - ${a}) / ${a}) × 100`));
        return;
      }
      if (b === 0) throw new UserError("Pembagi tidak boleh nol.");
      ctx.out(`${formatNumber(a, "id-ID", 4)} adalah ${formatNumber((a / b) * 100, "id-ID", 4)}% dari ${formatNumber(b, "id-ID", 4)}.`);
      ctx.out(muted(`(${a} / ${b}) × 100`));
    },
  },
  {
    id: "stats",
    category: "Angka",
    summary: "Rata-rata, median, modus, rentang, dan simpangan baku.",
    usage: "iky stats 1 2 3 4",
    fields: [{ key: "numbers", label: "Angka (pisahkan spasi atau koma)", type: "text", required: true }],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan angka.", "iky stats 1 2 3 4");
      return { numbers: args.join(" ") };
    },
    async run(input, ctx) {
      const numbers = parseNumbers(fromInput(input, "numbers", ctx, "iky stats"));
      if (!numbers.length) throw new UserError("Tidak ada angka yang bisa dihitung.");
      const count = numbers.length;
      const sum = numbers.reduce((total, value) => total + value, 0);
      const mean = sum / count;
      const sorted = [...numbers].sort((a, b) => a - b);
      const median =
        count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
      const variance = numbers.reduce((total, value) => total + (value - mean) ** 2, 0) / count;
      const frequency = new Map();
      for (const value of numbers) frequency.set(value, (frequency.get(value) ?? 0) + 1);
      const maximumFrequency = Math.max(...frequency.values());
      const modes = maximumFrequency > 1
        ? [...frequency.entries()].filter(([, amount]) => amount === maximumFrequency).map(([value]) => value)
        : [];
      ctx.out(heading("Statistik"));
      ctx.out(
        table(
          ["Ukuran", "Nilai"],
          [
            ["Jumlah data", formatNumber(count)],
            ["Total", formatNumber(sum, "id-ID", 4)],
            ["Minimum", formatNumber(sorted[0], "id-ID", 4)],
            ["Maksimum", formatNumber(sorted.at(-1), "id-ID", 4)],
            ["Rentang", formatNumber(sorted.at(-1) - sorted[0], "id-ID", 4)],
            ["Rata-rata", formatNumber(mean, "id-ID", 4)],
            ["Median", formatNumber(median, "id-ID", 4)],
            ["Modus", modes.length ? modes.map((value) => formatNumber(value, "id-ID", 4)).join(", ") : "tidak ada"],
            ["Simpangan baku", formatNumber(Math.sqrt(variance), "id-ID", 4)],
            ["Variansi", formatNumber(variance, "id-ID", 4)],
          ],
          { maxWidth: 48 },
        ),
      );
      ctx.out(note("Simpangan baku dan variansi dihitung sebagai populasi, bukan sampel."));
    },
  },
  {
    id: "prime",
    category: "Angka",
    summary: "Periksa bilangan prima dan tampilkan faktorisasinya.",
    usage: "iky prime 97",
    fields: [{ key: "number", label: "Bilangan bulat", type: "number", required: true }],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan bilangan.", "iky prime 97");
      return { number: toInteger(args[0], "Bilangan") };
    },
    async run(input, ctx) {
      const number = toInteger(input.number, "Bilangan");
      if (!Number.isSafeInteger(number) || Math.abs(number) > 1_000_000_000_000) {
        throw new UserError("Bilangan harus aman dan maksimal 1.000.000.000.000.");
      }
      const factors = factorize(number);
      const grouped = groupFactors(factors);
      ctx.out(heading(`Prima: ${formatNumber(number)}`));
      ctx.out(
        table(
          ["Pertanyaan", "Jawaban"],
          [
            ["Prima?", isPrime(number) ? "ya" : "bukan"],
            ["Faktorisasi", grouped.length ? grouped : "tidak ada"],
            ["Prima berikutnya", String(nextPrime(number))],
            ["Prima sebelumnya", String(previousPrime(number))],
          ],
          { maxWidth: 56 },
        ),
      );
      if (number === 0 || number === 1) ctx.out(note("0 dan 1 bukan bilangan prima."));
      if (number < 0) ctx.out(note("Faktorisasi bilangan negatif menyertakan -1."));
    },
  },
  {
    id: "gcdlcm",
    category: "Angka",
    summary: "Hitung FPB dan KPK dari dua angka atau lebih.",
    usage: "iky gcdlcm 12 18 24",
    fields: [{ key: "numbers", label: "Angka", type: "text", required: true }],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan minimal dua angka.", "iky gcdlcm 12 18");
      return { numbers: args.join(" ") };
    },
    async run(input, ctx) {
      const values = listFromArgs(
        fromInput(input, "numbers", ctx, "iky gcdlcm")
          .split(/[,\s]+/)
          .filter(Boolean),
      );
      if (values.length < 2) throw new UserError("Butuh minimal dua angka.");
      const numbers = values.map((value) => {
        const integer = toInteger(value, "Angka");
        if (!Number.isSafeInteger(integer)) throw new UserError(`Angka terlalu besar: ${value}`);
        return BigInt(integer);
      });
      const gcd = numbers.reduce((left, right) => gcdBig(left < 0n ? -left : left, right < 0n ? -right : right));
      const lcm = numbers.reduce((left, right) => lcmBig(left, right));
      ctx.out(`FPB: ${formatBig(gcd)}`);
      ctx.out(`KPK: ${formatBig(lcm)}`);
      ctx.out(muted(`${numbers.length} angka: ${numbers.map(formatBig).join(", ")}`));
    },
  },
];

function parseNumbers(text) {
  return String(text)
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => toNumber(part, "Angka"));
}

export function isPrime(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 2) return false;
  if (number === 2 || number === 3) return true;
  if (number % 2 === 0 || number % 3 === 0) return false;
  for (let divisor = 5; divisor * divisor <= number; divisor += 6) {
    if (number % divisor === 0 || number % (divisor + 2) === 0) return false;
  }
  return true;
}

export function factorize(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || Math.abs(number) < 2) return [];
  const factors = [];
  let remaining = Math.abs(number);
  if (number < 0) factors.push("-1");
  for (let divisor = 2; divisor * divisor <= remaining; divisor += 1) {
    while (remaining % divisor === 0) {
      factors.push(String(divisor));
      remaining /= divisor;
    }
  }
  if (remaining > 1) factors.push(String(remaining));
  return factors;
}

function groupFactors(factors) {
  if (!factors.length) return "";
  const counts = new Map();
  for (const factor of factors) counts.set(factor, (counts.get(factor) ?? 0) + 1);
  return [...counts.entries()]
    .map(([factor, count]) => (count === 1 ? factor : `${factor}^${count}`))
    .join(" × ");
}

function nextPrime(value) {  let candidate = Math.max(2, Math.floor(value) + 1);
  while (!isPrime(candidate)) candidate += 1;
  return candidate;
}

function previousPrime(value) {
  let candidate = Math.floor(value) - 1;
  while (candidate >= 2 && !isPrime(candidate)) candidate -= 1;
  return candidate >= 2 ? candidate : 2;
}

function gcdBig(a, b) {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) [left, right] = [right, left % right];
  return left;
}

function lcmBig(a, b) {
  if (a === 0n || b === 0n) return 0n;
  const absoluteA = a < 0n ? -a : a;
  const absoluteB = b < 0n ? -b : b;
  return (absoluteA / gcdBig(absoluteA, absoluteB)) * absoluteB;
}

function formatBig(value) {
  return value.toLocaleString("id-ID");
}
