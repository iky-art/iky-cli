import crypto from "node:crypto";
import { heading, table, note, muted, good, bad, color as colorEnabled } from "../lib/ui.js";
import { formatNumber } from "../lib/format.js";
import { UserError, extractFlag, toInteger } from "../lib/args.js";
import {
  parseColor,
  toHex,
  toRgbString,
  toHslString,
  relativeLuminance,
  contrastRatio,
  contrastLabel,
} from "../lib/color.js";
import { toMorse, fromMorse } from "../lib/text.js";
import { textFromArgs, fromInput } from "./helpers.js";

function swatch(color, label) {
  if (!colorEnabled || !process.stdout.isTTY) return "";
  return `\u001b[48;2;${color.r};${color.g};${color.b}m        \u001b[0m ${muted(label)}`;
}

export const randomCommands = [
  {
    id: "dice",
    category: "Acak & Warna",
    summary: "Lempar dadu dengan notasi seperti 2d6+3.",
    usage: "iky dice 2d6+3",
    fields: [{ key: "notation", label: "Notasi dadu", type: "text", required: true, default: "1d6" }],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan notasi dadu.", "iky dice 2d6+3");
      return { notation: args[0] };
    },
    async run(input, ctx) {
      const notation = fromInput(input, "notation", ctx, "iky dice").trim().toLowerCase();
      const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/);
      if (!match) throw new UserError("Notasi tidak valid. Contoh: d20, 2d6+3, 3d8-1.");
      const count = match[1] ? toInteger(match[1], "Jumlah dadu") : 1;
      const sides = toInteger(match[2], "Sisi dadu");
      const modifier = match[3] ? toInteger(match[3], "Modifier") : 0;
      if (count < 1 || count > 100) throw new UserError("Jumlah dadu harus antara 1 dan 100.");
      if (sides < 2 || sides > 1000) throw new UserError("Sisi dadu harus antara 2 dan 1000.");
      if (Math.abs(modifier) > 10000) throw new UserError("Modifier terlalu besar.");
      const rolls = Array.from({ length: count }, () => crypto.randomInt(1, sides + 1));
      const total = rolls.reduce((sum, value) => sum + value, 0) + modifier;
      ctx.out(heading(`Lempar ${notation}`));
      ctx.out(`Dadu: ${rolls.join(", ")}`);
      if (modifier) ctx.out(`Modifier: ${modifier > 0 ? "+" : ""}${modifier}`);
      ctx.out(`Total: ${formatNumber(total)}`);
      if (count > 1) {
        ctx.out(muted(`Rata-rata: ${formatNumber(total / count, "id-ID", 2)}`));
      }
    },
  },
  {
    id: "pick",
    category: "Acak & Warna",
    summary: "Pilih satu atau beberapa item secara acak dan adil.",
    usage: "iky pick apel jeruk mangga [--count 1]",
    fields: [
      { key: "items", label: "Daftar item (pisahkan koma atau baris baru)", type: "multiline", required: true },
      { key: "count", label: "Jumlah pemenang", type: "number", default: 1, required: true, min: 1, max: 100 },
    ],
    parse(args) {
      const flag = extractFlag(args, "--count");
      const items = splitItems(flag.args);
      if (!items.length) throw new UserError("Masukkan daftar item.", "iky pick apel jeruk mangga");
      return { items, count: flag.value ? toInteger(flag.value, "--count") : 1 };
    },
    async run(input, ctx) {
      const items = Array.isArray(input.items) ? input.items : splitItems([String(input.items ?? "")]);
      const count = toInteger(input.count ?? 1, "Jumlah pemenang");
      if (!items.length) throw new UserError("Daftar item kosong.");
      if (count < 1 || count > items.length) {
        throw new UserError(`Jumlah pemenang harus antara 1 dan ${items.length}.`);
      }
      const pool = [...items];
      for (let index = pool.length - 1; index > 0; index -= 1) {
        const swap = crypto.randomInt(0, index + 1);
        [pool[index], pool[swap]] = [pool[swap], pool[index]];
      }
      const winners = pool.slice(0, count);
      ctx.out(heading(count === 1 ? "Pemenang" : `${count} pemenang`));
      for (const winner of winners) ctx.out(good(winner));
      ctx.out(muted(`${formatNumber(items.length)} item, ${count} dipilih tanpa pengembalian.`));
    },
  },
  {
    id: "color",
    category: "Acak & Warna",
    summary: "Detail warna dari hex, rgb, atau hsl, termasuk kontras hitam dan putih.",
    usage: 'iky color "#d95d39"',
    fields: [{ key: "color", label: "Warna", type: "text", required: true, default: "#d95d39" }],
    parse(args, ctx) {
      return { color: textFromArgs(args, ctx, 'iky color "#d95d39"') };
    },
    async run(input, ctx) {
      const value = parseColor(fromInput(input, "color", ctx, "iky color"));
      const black = { r: 0, g: 0, b: 0, a: 1 };
      const white = { r: 255, g: 255, b: 255, a: 1 };
      const luminance = relativeLuminance(value);
      ctx.out(heading("Detail warna"));
      ctx.out(
        table(
          ["Format", "Nilai"],
          [
            ["HEX", toHex(value, true)],
            ["RGB", toRgbString(value)],
            ["HSL", toHslString(value)],
            ["Luminance", luminance.toFixed(4)],
            ["Kontras hitam", `${contrastRatio(value, black).toFixed(2)}:1`],
            ["Kontras putih", `${contrastRatio(value, white).toFixed(2)}:1`],
          ],
          { maxWidth: 44 },
        ),
      );
      const preview = swatch(value, "contoh warna");
      if (preview) ctx.out(preview);
      const best = contrastRatio(value, black) >= contrastRatio(value, white) ? "hitam" : "putih";
      ctx.out(muted(`Teks paling terbaca di atas warna ini: ${best}.`));
    },
  },
  {
    id: "contrast",
    category: "Acak & Warna",
    summary: "Uji rasio kontras WCAG antara warna teks dan latar.",
    usage: 'iky contrast "#1b2430" "#e8edf2"',
    fields: [
      { key: "foreground", label: "Warna teks", type: "text", required: true, default: "#1b2430" },
      { key: "background", label: "Warna latar", type: "text", required: true, default: "#e8edf2" },
    ],
    parse(args) {
      if (args.length < 2) throw new UserError("Butuh dua warna.", 'iky contrast "#111" "#eee"');
      return { foreground: args[0], background: args[1] };
    },
    async run(input, ctx) {
      const foreground = parseColor(fromInput(input, "foreground", ctx, "iky contrast"));
      const background = parseColor(fromInput(input, "background", ctx, "iky contrast"));
      const ratio = contrastRatio(foreground, background);
      const normalAA = ratio >= 4.5;
      const normalAAA = ratio >= 7;
      const largeAA = ratio >= 3;
      ctx.out(heading("Kontras WCAG"));
      ctx.out(`Rasio: ${ratio.toFixed(2)}:1 (${contrastLabel(ratio)})`);
      ctx.out(`${normalAA ? good("Lulus") : bad("Gagal")} teks normal AA (minimum 4.5:1)`);
      ctx.out(`${normalAAA ? good("Lulus") : bad("Gagal")} teks normal AAA (minimum 7:1)`);
      ctx.out(`${largeAA ? good("Lulus") : bad("Gagal")} teks besar AA (minimum 3:1)`);
      ctx.out(
        table(
          ["Warna", "Nilai"],
          [
            ["Teks", `${toHex(foreground)} · ${toRgbString(foreground)}`],
            ["Latar", `${toHex(background)} · ${toRgbString(background)}`],
          ],
          { maxWidth: 50 },
        ),
      );
      if (foreground.a < 1) ctx.out(note("Alpha teks dikompositkan di atas warna latar sebelum dihitung."));
      ctx.out(muted("Teks besar berarti 18pt ke atas, atau 14pt tebal ke atas."));
    },
  },
  {
    id: "morse",
    category: "Acak & Warna",
    summary: "Encode atau decode kode Morse internasional.",
    usage: 'iky morse <encode|decode> "sos"',
    fields: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        choices: [
          { value: "encode", label: "encode" },
          { value: "decode", label: "decode" },
        ],
        required: true,
      },
      { key: "text", label: "Teks atau kode", type: "multiline", required: true },
    ],
    parse(args, ctx) {
      const mode = args[0]?.toLowerCase();
      if (!["encode", "decode"].includes(mode)) {
        throw new UserError("Mode harus encode atau decode.", 'iky morse <encode|decode> "sos"');
      }
      return { mode, text: textFromArgs(args.slice(1), ctx, "iky morse <mode>") };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky morse");
      if (input.mode === "encode") {
        ctx.out(toMorse(text));
        ctx.out(muted("Gunakan / untuk pemisah kata saat decode."));
      } else {
        ctx.out(fromMorse(text));
      }
    },
  },
];

function splitItems(args) {
  return args
    .join("\n")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
