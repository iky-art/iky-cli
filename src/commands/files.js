import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { heading, note, muted } from "../lib/ui.js";
import { formatBytes, detectMime } from "../lib/format.js";
import { UserError, extractFlag, hasFlag, toInteger } from "../lib/args.js";
import { table } from "../lib/ui.js";
import { fromInput } from "./helpers.js";

const skipped = new Set(["node_modules", ".git", ".hg", ".svn"]);
const limit = 500;

export const fileCommands = [
  {
    id: "tree",
    category: "File",
    summary: "Tampilkan struktur direktori dengan batas kedalaman.",
    usage: "iky tree [path] [kedalaman] [--all]",
    fields: [
      { key: "target", label: "Path", type: "path", default: ".", required: true },
      { key: "depth", label: "Kedalaman", type: "number", default: 2, required: true, min: 1, max: 10 },
      { key: "all", label: "Tampilkan file tersembunyi?", type: "confirm", default: false },
    ],
    parse(args) {
      const flag = extractFlag(args, "--depth", "-d");
      const rest = flag.args.filter((token) => token !== "--all");
      const target = rest[0] ?? ".";
      const depth = flag.value ? toInteger(flag.value, "--depth") : rest[1] ? toInteger(rest[1], "Kedalaman") : 2;
      return { target, depth, all: hasFlag(args, "--all") };
    },
    async run(input, ctx) {
      const root = path.resolve(input.target || ".");
      const depth = toInteger(input.depth ?? 2, "Kedalaman");
      if (depth < 1 || depth > 10) throw new UserError("Kedalaman harus antara 1 dan 10.");
      const stat = await fs.stat(root).catch(() => {
        throw new UserError(`Path tidak ditemukan: ${root}`);
      });
      if (!stat.isDirectory()) throw new UserError(`Bukan direktori: ${root}`);
      const state = { count: 0, cut: false };
      const lines = [];
      async function walk(directory, prefix, level) {
        if (level > depth || state.count >= limit) {
          if (state.count >= limit) state.cut = true;
          return;
        }
        let entries;
        try {
          entries = await fs.readdir(directory, { withFileTypes: true });
        } catch {
          lines.push(`${prefix}${muted("[tidak bisa dibaca]")}`);
          return;
        }
        entries = entries
          .filter((entry) => input.all || (!entry.name.startsWith(".") && !skipped.has(entry.name)))
          .sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
            return a.name.localeCompare(b.name, "id");
          });
        for (let index = 0; index < entries.length; index += 1) {
          if (state.count >= limit) {
            state.cut = true;
            return;
          }
          const entry = entries[index];
          state.count += 1;
          const last = index === entries.length - 1;
          const connector = last ? "└── " : "├── ";
          const marker = entry.isSymbolicLink() ? "@" : entry.isDirectory() ? "/" : "";
          lines.push(`${prefix}${connector}${entry.name}${marker}`);
          if (entry.isDirectory() && !entry.isSymbolicLink() && level < depth) {
            await walk(path.join(directory, entry.name), `${prefix}${last ? "    " : "│   "}`, level + 1);
          }
        }
      }
      await walk(root, "", 1);
      ctx.out(heading(`Tree: ${root}`));
      if (!lines.length) {
        ctx.out("(direktori kosong)");
      } else {
        ctx.out(`${path.basename(root) || root}/`);
        for (const line of lines) ctx.out(line);
      }
      ctx.out("");
      ctx.out(muted(`${state.count} entri · kedalaman ${depth}${state.cut ? ` · dipotong di ${limit}` : ""}`));
      if (!input.all) {
        ctx.out(note("File tersembunyi, node_modules, dan .git dilewati. Pakai --all untuk menampilkan semuanya."));
      }
    },
  },
  {
    id: "file-info",
    category: "File",
    summary: "Statistik file, tipe MIME, dan hash SHA-256.",
    usage: "iky file-info package.json",
    fields: [{ key: "target", label: "Path file", type: "path", required: true }],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan path file.", "iky file-info package.json");
      return { target: args.join(" ") };
    },
    async run(input, ctx) {
      const target = path.resolve(fromInput(input, "target", ctx, "iky file-info"));
      const stat = await fs.lstat(target).catch(() => {
        throw new UserError(`File tidak ditemukan: ${target}`);
      });
      const type = stat.isDirectory()
        ? "direktori"
        : stat.isSymbolicLink()
          ? "symlink"
          : stat.isFile()
            ? "file"
            : "lainnya";
      const row = [
        ["Path", target],
        ["Tipe", type],
        ["Ukuran", formatBytes(stat.size)],
        ["MIME", stat.isFile() ? detectMime(target) : "-"],
        ["Mode", `0${(stat.mode & 0o777).toString(8)}`],
        ["UID / GID", `${stat.uid} / ${stat.gid}`],
        ["Dibuat", stat.birthtime.toLocaleString("id-ID")],
        ["Diubah", stat.mtime.toLocaleString("id-ID")],
        ["Diakses", stat.atime.toLocaleString("id-ID")],
      ];
      if (stat.isSymbolicLink()) {
        const link = await fs.readlink(target).catch(() => "?");
        row.push(["Menunjuk ke", link]);
      }
      if (stat.isDirectory()) {
        const entries = await fs.readdir(target).catch(() => []);
        row.push(["Isi direktori", `${entries.length} entri`]);
      }
      if (stat.isFile()) {
        if (stat.size <= 50 * 1024 * 1024) {
          const hash = await hashFile(target);
          row.push(["SHA-256", hash]);
        } else {
          row.push(["SHA-256", "(dilewati, file di atas 50 MB)"]);
        }
      }
      ctx.out(heading("Informasi file"));
      ctx.out(table(["Field", "Nilai"], row, { maxWidth: 68 }));
    },
  },
];

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const digest = crypto.createHash("sha256");
    const stream = createReadStream(file);
    stream.on("data", (chunk) => digest.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(digest.digest("hex")));
  });
}
