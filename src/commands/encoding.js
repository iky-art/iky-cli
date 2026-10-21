import crypto from "node:crypto";
import fs from "node:fs";
import { createReadStream } from "node:fs";
import { heading, table, note, muted, bold } from "../lib/ui.js";
import { formatBytes } from "../lib/format.js";
import { UserError, extractFlag, hasFlag, toInteger } from "../lib/args.js";
import { textFromArgs, fromInput } from "./helpers.js";

function decodeBase64(input, urlSafe) {
  let text = String(input).replace(/\s+/g, "");
  if (urlSafe) text = text.replaceAll("-", "+").replaceAll("_", "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new UserError("Teks bukan base64 yang valid.");
  if (text.length % 4 === 1) throw new UserError("Panjang base64 tidak valid.");
  const buffer = Buffer.from(text, "base64");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new UserError("Hasil decode bukan teks UTF-8 yang valid.");
  }
}

export const encodingCommands = [
  {
    id: "base64",
    category: "Encoding",
    summary: "Encode atau decode base64, termasuk varian URL-safe.",
    usage: 'iky base64 <encode|decode> "teks" [--url]',
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
      { key: "text", label: "Teks", type: "multiline", required: true },
      { key: "urlSafe", label: "URL-safe?", type: "confirm", default: false },
    ],
    parse(args, ctx) {
      const mode = args[0]?.toLowerCase();
      if (!["encode", "decode"].includes(mode)) {
        throw new UserError("Mode harus encode atau decode.", 'iky base64 <encode|decode> "teks"');
      }
      return {
        mode,
        text: textFromArgs(args.slice(1).filter((token) => token !== "--url"), ctx, "iky base64 <mode>"),
        urlSafe: hasFlag(args, "--url"),
      };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky base64");
      if (input.mode === "encode") {
        let output = Buffer.from(text, "utf8").toString("base64");
        if (input.urlSafe) output = output.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
        ctx.out(output);
      } else {
        ctx.out(decodeBase64(text, input.urlSafe));
      }
    },
  },
  {
    id: "urlcode",
    category: "Encoding",
    summary: "Encode atau decode komponen URL.",
    usage: 'iky urlcode <encode|decode> "teks"',
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
      { key: "text", label: "Teks", type: "multiline", required: true },
    ],
    parse(args, ctx) {
      const mode = args[0]?.toLowerCase();
      if (!["encode", "decode"].includes(mode)) {
        throw new UserError("Mode harus encode atau decode.", 'iky urlcode <encode|decode> "teks"');
      }
      return { mode, text: textFromArgs(args.slice(1), ctx, "iky urlcode <mode>") };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky urlcode");
      if (input.mode === "encode") {
        ctx.out(encodeURIComponent(text));
        return;
      }
      try {
        ctx.out(decodeURIComponent(text.replaceAll("+", " ")));
      } catch {
        throw new UserError("Teks berisi escape URL yang tidak valid.");
      }
    },
  },
  {
    id: "hex",
    category: "Encoding",
    summary: "Ubah teks UTF-8 ke hex, atau hex kembali ke teks.",
    usage: 'iky hex <encode|decode> "teks"',
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
      { key: "text", label: "Teks", type: "multiline", required: true },
      { key: "spaced", label: "Beri spasi antar byte?", type: "confirm", default: false },
    ],
    parse(args, ctx) {
      const mode = args[0]?.toLowerCase();
      if (!["encode", "decode"].includes(mode)) {
        throw new UserError("Mode harus encode atau decode.", 'iky hex <encode|decode> "teks"');
      }
      return {
        mode,
        text: textFromArgs(args.slice(1).filter((token) => token !== "--spaced"), ctx, "iky hex <mode>"),
        spaced: hasFlag(args, "--spaced"),
      };
    },
    async run(input, ctx) {
      const text = fromInput(input, "text", ctx, "iky hex");
      if (input.mode === "encode") {
        const hex = Buffer.from(text, "utf8").toString("hex");
        ctx.out(input.spaced ? hex.match(/.{1,2}/g)?.join(" ") ?? "" : hex);
        return;
      }
      const clean = text.replace(/0x/gi, "").replace(/[\s:-]/g, "");
      if (!/^[0-9a-f]*$/i.test(clean) || clean.length % 2 !== 0) {
        throw new UserError("Hex harus berisi pasangan 0-9 dan a-f.");
      }
      try {
        ctx.out(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(clean, "hex")));
      } catch {
        throw new UserError("Hex tersebut bukan teks UTF-8 yang valid.");
      }
    },
  },
  {
    id: "hash",
    category: "Encoding",
    summary: "Hash teks atau file dengan md5, sha1, sha256, atau sha512.",
    usage: 'iky hash [algo] "teks" | iky hash [algo] --file path',
    fields: [
      {
        key: "algorithm",
        label: "Algoritma",
        type: "select",
        choices: ["sha256", "sha512", "sha1", "md5"].map((value) => ({ value, label: value })),
        required: true,
      },
      {
        key: "source",
        label: "Sumber",
        type: "select",
        choices: [
          { value: "text", label: "teks" },
          { value: "file", label: "file" },
        ],
        required: true,
      },
      { key: "text", label: "Teks", type: "multiline", required: true, when: (input) => input.source !== "file" },
      { key: "path", label: "Path file", type: "path", required: true, when: (input) => input.source === "file" },
    ],
    parse(args, ctx) {
      const algorithms = ["md5", "sha1", "sha256", "sha512"];
      const flag = extractFlag(args, "--file", "-f");
      let rest = flag.args;
      let algorithm = "sha256";
      if (algorithms.includes(rest[0]?.toLowerCase())) {
        algorithm = rest[0].toLowerCase();
        rest = rest.slice(1);
      }
      if (flag.value) return { algorithm, source: "file", path: flag.value, text: "" };
      return { algorithm, source: "text", text: textFromArgs(rest, ctx, 'iky hash [algo] "teks"') };
    },
    async run(input, ctx) {
      const algorithm = String(input.algorithm || "sha256").toLowerCase();
      if (!crypto.getHashes().includes(algorithm)) {
        throw new UserError(`Algoritma tidak didukung: ${algorithm}`);
      }
      if (input.source === "file") {
        const filePath = fromInput(input, "path", ctx, "iky hash --file path");
        const stat = await fs.promises.stat(filePath).catch(() => {
          throw new UserError(`File tidak ditemukan: ${filePath}`);
        });
        if (!stat.isFile()) throw new UserError(`Bukan file: ${filePath}`);
        const digest = await new Promise((resolve, reject) => {
          const hash = crypto.createHash(algorithm);
          const stream = createReadStream(filePath);
          stream.on("data", (chunk) => hash.update(chunk));
          stream.on("error", reject);
          stream.on("end", () => resolve(hash.digest("hex")));
        });
        ctx.out(digest);
        ctx.out(muted(`${algorithm} · ${formatBytes(stat.size)} · ${filePath}`));
      } else {
        const text = fromInput(input, "text", ctx, "iky hash");
        const digest = crypto.createHash(algorithm).update(text, "utf8").digest("hex");
        ctx.out(digest);
        ctx.out(muted(`${algorithm} · ${Buffer.byteLength(text, "utf8")} byte teks`));
      }
      if (algorithm === "md5" || algorithm === "sha1") {
        ctx.out(note(`${algorithm.toUpperCase()} hanya cocok untuk checksum, bukan untuk keamanan.`));
      }
    },
  },
  {
    id: "uuid",
    category: "Encoding",
    summary: "Buat UUID v4 acak, satu atau beberapa sekaligus.",
    usage: "iky uuid [jumlah] [--upper]",
    fields: [
      { key: "count", label: "Jumlah", type: "number", default: 1, required: true, min: 1, max: 100 },
      { key: "upper", label: "Huruf besar?", type: "confirm", default: false },
    ],
    parse(args) {
      const upper = hasFlag(args, "--upper");
      const clean = args.filter((token) => !token.startsWith("--"));
      return { count: clean.length ? toInteger(clean[0], "Jumlah") : 1, upper };
    },
    async run(input, ctx) {
      const count = toInteger(input.count ?? 1, "Jumlah");
      if (count < 1 || count > 100) throw new UserError("Jumlah UUID harus antara 1 dan 100.");
      const values = Array.from({ length: count }, () => crypto.randomUUID());
      for (const value of values) ctx.out(input.upper ? value.toUpperCase() : value);
    },
  },
  {
    id: "jwt",
    category: "Encoding",
    summary: "Baca header dan payload JWT tanpa memverifikasi tanda tangan.",
    usage: 'iky jwt "token"',
    fields: [{ key: "token", label: "Token JWT", type: "text", required: true }],
    parse(args, ctx) {
      return { token: textFromArgs(args, ctx, 'iky jwt "token"') };
    },
    async run(input, ctx) {
      const token = fromInput(input, "token", ctx, "iky jwt").trim();
      const parts = token.split(".");
      if (parts.length !== 3) throw new UserError("JWT harus memiliki tiga bagian yang dipisahkan titik.");
      const decodePart = (part, label) => {
        try {
          const normalized = part.replaceAll("-", "+").replaceAll("_", "/");
          const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
          return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
        } catch {
          throw new UserError(`Bagian ${label} tidak bisa dibaca sebagai JSON base64url.`);
        }
      };
      const header = decodePart(parts[0], "header");
      const payload = decodePart(parts[1], "payload");
      ctx.out(heading("Header"));
      ctx.out(JSON.stringify(header, null, 2));
      ctx.out(heading("Payload"));
      ctx.out(JSON.stringify(payload, null, 2));
      if (typeof payload.exp === "number") {
        const expiry = new Date(payload.exp * 1000);
        const expired = expiry.getTime() < Date.now();
        ctx.out(`${expired ? "Kedaluwarsa" : "Berlaku sampai"}: ${expiry.toISOString()}`);
      }
      if (typeof payload.iat === "number") {
        ctx.out(`Diterbitkan: ${new Date(payload.iat * 1000).toISOString()}`);
      }
      ctx.out(note("Tanda tangan tidak diverifikasi. Jangan pakai hasil ini untuk keputusan keamanan."));
    },
  },
  {
    id: "password",
    category: "Encoding",
    summary: "Buat password acak dengan panjang dan karakter yang dipilih.",
    usage: "iky password [panjang] [--no-symbols] [--no-upper] [--no-numbers]",
    fields: [
      { key: "length", label: "Panjang", type: "number", default: 20, required: true, min: 8, max: 128 },
      { key: "symbols", label: "Pakai simbol?", type: "confirm", default: true },
      { key: "numbers", label: "Pakai angka?", type: "confirm", default: true },
      { key: "uppercase", label: "Pakai huruf besar?", type: "confirm", default: true },
      { key: "avoidAmbiguous", label: "Hindari karakter mirip?", type: "confirm", default: false },
    ],
    parse(args) {
      const clean = args.filter((token) => !token.startsWith("--"));
      return {
        length: clean.length ? toInteger(clean[0], "Panjang") : 20,
        symbols: !hasFlag(args, "--no-symbols"),
        numbers: !hasFlag(args, "--no-numbers"),
        uppercase: !hasFlag(args, "--no-upper"),
        avoidAmbiguous: hasFlag(args, "--avoid-ambiguous"),
      };
    },
    async run(input, ctx) {
      const length = toInteger(input.length ?? 20, "Panjang");
      if (length < 8 || length > 128) throw new UserError("Panjang password harus antara 8 dan 128.");
      const groups = ["abcdefghijkmnopqrstuvwxyz"];
      if (input.uppercase !== false) groups.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
      if (input.numbers !== false) groups.push("23456789");
      if (input.symbols !== false) groups.push("!@#$%^&*()-_=+[]{};:,.?");
      let alphabet = groups.join("");
      if (input.avoidAmbiguous) alphabet = alphabet.replace(/[Il1O0o]/g, "");
      if (length < groups.length) throw new UserError("Panjang terlalu pendek untuk semua jenis karakter.");
      const random = (max) => crypto.randomInt(0, max);
      const characters = groups.map((group) => group[random(group.length)]);
      while (characters.length < length) characters.push(alphabet[random(alphabet.length)]);
      for (let index = characters.length - 1; index > 0; index -= 1) {
        const swap = random(index + 1);
        [characters[index], characters[swap]] = [characters[swap], characters[index]];
      }
      const password = characters.join("");
      const entropy = length * Math.log2(alphabet.length);
      ctx.out(bold(password));
      ctx.out(muted(`${length} karakter · sekitar ${entropy.toFixed(0)} bit entropi`));
      ctx.out(note("Password ini hanya ditampilkan di terminal. Simpan ke password manager."));
    },
  },
];
