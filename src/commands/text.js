import { heading, table, note, good, bad, muted } from "../lib/ui.js";
import { UserError, extractFlag, hasFlag, toInteger } from "../lib/args.js";
import { formatNumber as numberFormat } from "../lib/format.js";
import {
  countText,
  convertCase,
  wrapText,
  transformLines,
  lineDiff,
  wordFrequency,
} from "../lib/text.js";
import { slugify, graphemes, escapeHtml, unescapeHtml } from "../lib/format.js";
import { textFromArgs, fromInput } from "./helpers.js";

const caseModes = ["lower", "upper", "title", "sentence", "camel", "pascal", "snake", "kebab", "constant"];

export const textCommands = [
  {
    id: "count",
    category: "Teks",
    summary: "Hitung karakter, kata, baris, kalimat, dan waktu baca.",
    usage: 'iky count "teks"',
    fields: [{ key: "text", label: "Teks", type: "multiline", required: true }],
    parse(args, ctx) {
      return { text: textFromArgs(args, ctx, 'iky count "teks"') };
    },
    async run(input, ctx) {
      const stats = countText(fromInput(input, "text", ctx, "iky count"));
      ctx.out(heading("Statistik teks"));
      ctx.out(
        table(
          ["Ukuran", "Jumlah"],
          [
            ["Karakter", numberFormat(stats.characters)],
            ["Tanpa spasi", numberFormat(stats.charactersNoSpaces)],
            ["Kata", numberFormat(stats.words)],
            ["Kalimat", numberFormat(stats.sentences)],
            ["Baris", numberFormat(stats.lines)],
            ["Paragraf", numberFormat(stats.paragraphs)],
            ["Waktu baca", `${stats.readingMinutes.toFixed(1)} menit`],
          ],
        ),
      );
      ctx.out(note("Waktu baca memakai asumsi 200 kata per menit."));
    },
  },
  {
    id: "case",
    category: "Teks",
    summary: "Ubah teks ke lower, upper, title, camel, snake, atau kebab.",
    usage: 'iky case <mode> "teks"',
    fields: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        choices: caseModes.map((mode) => ({ value: mode, label: mode })),
        required: true,
      },
      { key: "text", label: "Teks", type: "multiline", required: true },
    ],
    parse(args, ctx) {
      if (!args.length) throw new UserError("Pilih mode case.", 'iky case <mode> "teks"');
      const mode = args[0].toLowerCase();
      if (!caseModes.includes(mode)) {
        throw new UserError(`Mode tidak dikenal: ${mode}. Pilihan: ${caseModes.join(", ")}.`, "iky case <mode>");
      }
      return { mode, text: textFromArgs(args.slice(1), ctx, 'iky case <mode> "teks"') };
    },
    async run(input, ctx) {
      const mode = fromInput(input, "mode", ctx, "iky case <mode>");
      ctx.out(convertCase(fromInput(input, "text", ctx, "iky case"), mode));
    },
  },
  {
    id: "slug",
    category: "Teks",
    summary: "Buat slug URL dari teks, mendukung pemisah khusus.",
    usage: 'iky slug "teks" [--sep _]',
    fields: [
      { key: "text", label: "Teks", type: "multiline", required: true },
      { key: "separator", label: "Pemisah", type: "text", default: "-", required: true },
    ],
    parse(args, ctx) {
      const flag = extractFlag(args, "--sep", "--separator");
      const separator = flag.value ?? "-";
      if (!["-", "_", "."].includes(separator)) throw new UserError("Pemisah harus -, _, atau .");
      return { text: textFromArgs(flag.args, ctx, 'iky slug "teks"'), separator };
    },
    async run(input, ctx) {
      const slug = slugify(fromInput(input, "text", ctx, "iky slug"), input.separator || "-");
      ctx.out(slug || "(kosong)");
    },
  },
  {
    id: "reverse",
    category: "Teks",
    summary: "Balik urutan karakter tanpa merusak emoji atau aksen.",
    usage: 'iky reverse "teks"',
    fields: [{ key: "text", label: "Teks", type: "text", required: true }],
    parse(args, ctx) {
      return { text: textFromArgs(args, ctx, 'iky reverse "teks"') };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky reverse");
      ctx.out(graphemes(text).reverse().join(""));
    },
  },
  {
    id: "palindrome",
    category: "Teks",
    summary: "Periksa apakah teks adalah palindrom.",
    usage: 'iky palindrome "teks"',
    fields: [{ key: "text", label: "Teks", type: "text", required: true }],
    parse(args, ctx) {
      return { text: textFromArgs(args, ctx, 'iky palindrome "teks"') };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky palindrome");
      const normalized = graphemes(text)
        .filter((char) => /[\p{L}\p{N}]/u.test(char))
        .join("")
        .toLocaleLowerCase("id-ID");
      const reversed = graphemes(normalized).reverse().join("");
      const result = normalized.length > 0 && normalized === reversed;
      ctx.out(`${result ? good("Ya") : bad("Bukan")} palindrom.`);
      ctx.out(muted(`Bentuk normal: ${normalized || "(kosong)"}`));
      if (normalized.length) ctx.out(muted(`Dibaca balik: ${reversed}`));
    },
  },
  {
    id: "diff",
    category: "Teks",
    summary: "Bandingkan dua teks per baris dengan penanda tambah dan hapus.",
    usage: 'iky diff "teks-a" "teks-b"',
    fields: [
      { key: "left", label: "Teks pertama", type: "multiline", required: true },
      { key: "right", label: "Teks kedua", type: "multiline", required: true },
    ],
    parse(args) {
      if (args.length < 2) {
        throw new UserError("Butuh dua teks. Bungkus tiap teks dengan tanda kutip.", 'iky diff "a" "b"');
      }
      return { left: args[0], right: args[1] };
    },
    async run(input, ctx) {
      const left = fromInput(input, "left", ctx, "iky diff");
      const right = fromInput(input, "right", ctx, "iky diff");
      const rows = lineDiff(left, right);
      let added = 0;
      let removed = 0;
      let same = 0;
      for (const row of rows) {
        if (row.type === "add") {
          added += 1;
          ctx.out(good(`+ ${row.value}`));
        } else if (row.type === "del") {
          removed += 1;
          ctx.out(bad(`- ${row.value}`));
        } else {
          same += 1;
          ctx.out(`  ${row.value}`);
        }
      }
      ctx.out("");
      ctx.out(`${good(`+${added}`)} ${bad(`-${removed}`)} ${muted(`${same} baris sama`)}`);
    },
  },
  {
    id: "frequency",
    category: "Teks",
    summary: "Kata yang paling sering muncul, dengan stopword Indonesia dan Inggris.",
    usage: 'iky frequency "teks" [--top 10] [--all]',
    fields: [
      { key: "text", label: "Teks", type: "multiline", required: true },
      { key: "top", label: "Jumlah kata", type: "number", default: 10, required: true, min: 1, max: 100 },
      { key: "stopwords", label: "Abaikan stopword?", type: "confirm", default: true },
    ],
    parse(args, ctx) {
      const topFlag = extractFlag(args, "--top");
      const top = topFlag.value ? toInteger(topFlag.value, "--top") : 10;
      const stopwords = !hasFlag(args, "--all");
      return {
        text: textFromArgs(stopFlagArgs(topFlag.args), ctx, 'iky frequency "teks"'),
        top,
        stopwords,
      };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky frequency");
      const top = toInteger(input.top ?? 10, "Jumlah kata");
      const rows = wordFrequency(text, top, input.stopwords !== false);
      if (!rows.length) {
        ctx.out("Tidak ada kata yang bisa dihitung. Teks mungkin kosong atau hanya berisi stopword.");
        return;
      }
      const largest = rows[0].count;
      ctx.out(heading(`Frekuensi kata (${rows.length} teratas)`));
      for (const row of rows) {
        const bar = "█".repeat(Math.max(1, Math.round((row.count / largest) * 24)));
        ctx.out(`${numberFormat(row.count).padStart(5)}  ${row.word.padEnd(20)} ${muted(bar)}`);
      }
    },
  },
  {
    id: "replace",
    category: "Teks",
    summary: "Ganti teks secara literal atau dengan regex.",
    usage: 'iky replace "teks" "cari" "ganti" [--regex] [--flags gi]',
    fields: [
      { key: "text", label: "Teks", type: "multiline", required: true },
      { key: "find", label: "Cari", type: "text", required: true },
      { key: "replacement", label: "Ganti dengan", type: "text", required: false },
      { key: "regex", label: "Pakai regex?", type: "confirm", default: false },
      { key: "flags", label: "Flag regex", type: "text", default: "g", required: false },
    ],
    parse(args) {
      const regex = hasFlag(args, "--regex");
      const flag = extractFlag(args, "--flags");
      const parts = flag.args.filter((token) => !token.startsWith("--"));
      if (parts.length < 2) {
        throw new UserError("Butuh teks, kata yang dicari, dan pengganti.", 'iky replace "teks" "cari" "ganti"');
      }
      return {
        text: parts[0],
        find: parts[1],
        replacement: parts[2] ?? "",
        regex,
        flags: flag.value ?? "g",
      };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky replace");
      const find = fromInput(input, "find", ctx, "iky replace");
      const replacement = String(input.replacement ?? "");
      if (input.regex) {
        let flags = String(input.flags || "g");
        if (!flags.includes("g")) flags += "g";
        let regex;
        try {
          regex = new RegExp(find, flags);
        } catch (error) {
          throw new UserError(`Regex tidak valid: ${error.message}`);
        }
        const count = [...text.matchAll(new RegExp(regex.source, flags))].length;
        ctx.out(text.replace(regex, replacement));
        ctx.out("");
        ctx.out(muted(`${numberFormat(count)} penggantian dengan regex /${find}/${flags}.`));
        return;
      }
      const count = find ? text.split(find).length - 1 : 0;
      ctx.out(text.split(find).join(replacement));
      ctx.out("");
      ctx.out(muted(`${numberFormat(count)} penggantian literal.`));
    },
  },
  {
    id: "wrap",
    category: "Teks",
    summary: "Bungkus teks pada lebar kolom tertentu.",
    usage: 'iky wrap 60 "teks"',
    fields: [
      { key: "text", label: "Teks", type: "multiline", required: true },
      { key: "width", label: "Lebar", type: "number", default: 80, required: true, min: 10, max: 500 },
    ],
    parse(args, ctx) {
      const flag = extractFlag(args, "--width");
      let width = flag.value ? toInteger(flag.value, "--width") : 80;
      let rest = flag.args;
      if (!flag.value && /^\d+$/.test(rest[0] ?? "")) {
        width = toInteger(rest[0], "Lebar");
        rest = rest.slice(1);
      }
      if (width < 10 || width > 500) throw new UserError("Lebar harus antara 10 dan 500.");
      return { text: textFromArgs(rest, ctx, 'iky wrap 60 "teks"'), width };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky wrap");
      ctx.out(wrapText(text, input.width ?? 80));
    },
  },
  {
    id: "lines",
    category: "Teks",
    summary: "Urutkan, unikkan, rapikan, balik, atau nomori baris teks.",
    usage: "iky lines <aksi> \"teks\"",
    fields: [
      {
        key: "action",
        label: "Aksi",
        type: "select",
        choices: ["urutkan", "unik", "trim", "balik", "nomor", "rapatkan"].map((value) => ({
          value,
          label: value,
        })),
        required: true,
      },
      { key: "text", label: "Teks", type: "multiline", required: true },
    ],
    parse(args, ctx) {
      const actions = ["urutkan", "unik", "trim", "balik", "nomor", "rapatkan"];
      const action = args[0]?.toLowerCase();
      if (!actions.includes(action)) {
        throw new UserError(`Aksi harus salah satu: ${actions.join(", ")}.`, "iky lines <aksi>");
      }
      return { action, text: textFromArgs(args.slice(1), ctx, "iky lines <aksi>") };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky lines");
      ctx.out(transformLines(text, input.action));
    },
  },
];

function stopFlagArgs(args) {
  return args.filter((token) => !token.startsWith("--"));
}

// The HTML helpers live in this module so text utilities stay in one place.
export const htmlCommands = [
  {
    id: "html",
    category: "Encoding",
    summary: "Escape atau unescape entitas HTML dasar.",
    usage: "iky html <escape|unescape> \"teks\"",
    fields: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        choices: [
          { value: "escape", label: "escape" },
          { value: "unescape", label: "unescape" },
        ],
        required: true,
      },
      { key: "text", label: "Teks", type: "multiline", required: true },
    ],
    parse(args, ctx) {
      const mode = args[0]?.toLowerCase();
      if (!["escape", "unescape"].includes(mode)) {
        throw new UserError("Mode harus escape atau unescape.", "iky html <escape|unescape>");
      }
      return { mode, text: textFromArgs(args.slice(1), ctx, "iky html <mode>") };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky html");
      ctx.out(input.mode === "escape" ? escapeHtml(text) : unescapeHtml(text));
    },
  },
];
