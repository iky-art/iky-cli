import fs from "node:fs/promises";
import dns from "node:dns/promises";
import { heading, table, note, muted, good, bad } from "../lib/ui.js";
import { formatNumber } from "../lib/format.js";
import { UserError, extractFlag, hasFlag, toInteger } from "../lib/args.js";
import { parseJsonPath, queryJson, markdownToc } from "../lib/text.js";
import { readTextFile, pathExists } from "../lib/format.js";
import { textFromArgs, fromInput } from "./helpers.js";

async function loadJson(input, ctx) {
  let text;
  if (input.source === "file") {
    const file = fromInput(input, "path", ctx, "iky json --file path");
    text = await readTextFile(file);
  } else {
    text = fromInput(input, "text", ctx, "iky json");
  }
  try {
    return { text, value: JSON.parse(text) };
  } catch (error) {
    throw new UserError(`JSON tidak valid: ${error.message}`);
  }
}

export const developerCommands = [
  {
    id: "json",
    category: "Developer",
    summary: "Validasi, rapikan, atau minify JSON dari teks maupun file.",
    usage: "iky json <pretty|minify|valid> <teks|--file path>",
    fields: [
      {
        key: "action",
        label: "Aksi",
        type: "select",
        choices: ["pretty", "minify", "valid"].map((value) => ({ value, label: value })),
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
      { key: "text", label: "JSON", type: "multiline", required: true, when: (input) => input.source !== "file" },
      { key: "path", label: "Path file", type: "path", required: true, when: (input) => input.source === "file" },
    ],
    parse(args, ctx) {
      const action = args[0]?.toLowerCase();
      if (!["pretty", "minify", "valid"].includes(action)) {
        throw new UserError("Aksi harus pretty, minify, atau valid.", "iky json <aksi> <teks>");
      }
      const flag = extractFlag(args.slice(1), "--file", "-f");
      if (flag.value) return { action, source: "file", path: flag.value, text: "" };
      return { action, source: "text", text: textFromArgs(flag.args, ctx, "iky json <aksi> <teks>") };
    },
    async run(input, ctx) {
      const { text, value } = await loadJson(input, ctx);
      if (input.action === "valid") {
        const kind = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
        const detail =
          Array.isArray(value) ? `${value.length} item` : value && typeof value === "object" ? `${Object.keys(value).length} kunci` : "";
        ctx.out(good(`JSON valid (${kind}${detail ? `, ${detail}` : ""}).`));
        ctx.out(muted(`${Buffer.byteLength(text, "utf8")} byte`));
        return;
      }
      if (input.action === "minify") {
        ctx.out(JSON.stringify(value));
        return;
      }
      ctx.out(JSON.stringify(value, null, 2));
    },
  },
  {
    id: "jsonpath",
    category: "Developer",
    summary: "Ambil nilai dari JSON dengan path sederhana.",
    usage: 'iky jsonpath data.json "user.name"',
    fields: [
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
      { key: "text", label: "JSON", type: "multiline", required: true, when: (input) => input.source !== "file" },
      { key: "path", label: "Path file", type: "path", required: true, when: (input) => input.source === "file" },
      { key: "query", label: "JSON path", type: "text", required: false },
    ],
    async parse(args, ctx) {
      const flag = extractFlag(args, "--file", "-f");
      if (flag.value) {
        if (!flag.args.length) throw new UserError("Masukkan JSON path.", 'iky jsonpath --file data.json "user.name"');
        return { source: "file", path: flag.value, text: "", query: flag.args[0] };
      }
      if (args.length < 2) {
        throw new UserError("Butuh JSON dan path.", 'iky jsonpath data.json "user.name"');
      }
      if (await pathExists(args[0])) {
        return { source: "file", path: args[0], text: "", query: args[1] };
      }
      return { source: "text", text: args[0], query: args[1] };
    },
    async run(input, ctx) {
      let parsed;
      if (input.source === "file") {
        const text = await readTextFile(fromInput(input, "path", ctx, "iky jsonpath"));
        try {
          parsed = JSON.parse(text);
        } catch (error) {
          throw new UserError(`JSON tidak valid: ${error.message}`);
        }
      } else {
        try {
          parsed = JSON.parse(fromInput(input, "text", ctx, "iky jsonpath"));
        } catch (error) {
          throw new UserError(`JSON tidak valid: ${error.message}`);
        }
      }
      const query = String(input.query ?? "").trim();
      const tokens = parseJsonPath(query);
      if (!tokens.length) {
        ctx.out(JSON.stringify(parsed, null, 2));
        return;
      }
      const results = queryJson(parsed, tokens);
      if (!results.length) {
        ctx.out(`Tidak ada nilai pada path "${query}".`);
        return;
      }
      if (results.length === 1) {
        const value = results[0];
        ctx.out(typeof value === "string" ? value : JSON.stringify(value, null, 2));
      } else {
        ctx.out(JSON.stringify(results, null, 2));
        ctx.out(muted(`${results.length} nilai cocok.`));
      }
    },
  },
  {
    id: "url",
    category: "Developer",
    summary: "Uraikan komponen URL dan query string.",
    usage: 'iky url "https://example.com/halaman?q=iky"',
    fields: [{ key: "url", label: "URL", type: "text", required: true }],
    parse(args, ctx) {
      return { url: textFromArgs(args, ctx, 'iky url "https://example.com"') };
    },
    async run(input, ctx) {
      const raw = fromInput(input, "url", ctx, "iky url").trim();
      let parsed;
      let addedScheme = false;
      try {
        parsed = new URL(raw);
      } catch {
        try {
          parsed = new URL(`https://${raw}`);
          addedScheme = true;
        } catch {
          throw new UserError(`URL tidak valid: ${raw}`);
        }
      }
      const params = [...parsed.searchParams.entries()];
      ctx.out(heading("Komponen URL"));
      ctx.out(
        table(
          ["Field", "Nilai"],
          [
            ["Protocol", parsed.protocol.replace(":", "")],
            ["Host", parsed.host],
            ["Hostname", parsed.hostname],
            ["Port", parsed.port || "(default)"],
            ["Path", parsed.pathname],
            ["Query", parsed.search || "(kosong)"],
            ["Hash", parsed.hash || "(kosong)"],
            ["Origin", parsed.origin],
          ],
          { maxWidth: 60 },
        ),
      );
      if (params.length) {
        ctx.out(heading("Query string"));
        ctx.out(table(["Kunci", "Nilai"], params.map(([key, value]) => [key, value]), { maxWidth: 52 }));
      }
      if (parsed.username || parsed.password) {
        ctx.out(note("URL memuat kredensial. Bagian itu tidak ditampilkan."));
      }
      if (addedScheme) ctx.out(note("Skema https:// ditambahkan karena URL belum memilikinya."));
    },
  },
  {
    id: "http",
    category: "Developer",
    summary: "Cek status, header, dan waktu respons sebuah URL.",
    usage: "iky http https://example.com [--head]",
    fields: [
      { key: "url", label: "URL", type: "text", required: true },
      {
        key: "method",
        label: "Metode",
        type: "select",
        choices: [
          { value: "GET", label: "GET" },
          { value: "HEAD", label: "HEAD" },
        ],
        required: true,
      },
    ],
    parse(args) {
      const flag = extractFlag(args, "--method", "-X");
      const rest = flag.args.filter((token) => token !== "--head" && token !== "-I");
      if (!rest.length) throw new UserError("Masukkan URL.", "iky http https://example.com");
      const method = hasFlag(args, "--head") || hasFlag(args, "-I") ? "HEAD" : (flag.value ?? "GET").toUpperCase();
      return { url: rest[0], method };
    },
    async run(input, ctx) {
      const url = fromInput(input, "url", ctx, "iky http").trim();
      const method = String(input.method || "GET").toUpperCase();
      if (!["GET", "HEAD"].includes(method)) throw new UserError("Metode hanya GET atau HEAD.");
      const started = Date.now();
      let response;
      try {
        response = await fetch(url, {
          method,
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
          headers: { "user-agent": "iky-cli/1.0" },
        });
      } catch (error) {
        const reason = error.name === "TimeoutError" ? "melewati batas 15 detik" : (error.cause?.code ?? error.message);
        throw new UserError(`Permintaan gagal: ${reason}`);
      }
      const elapsed = Date.now() - started;
      const headers = [...response.headers.entries()];
      ctx.out(heading("Respons HTTP"));
      ctx.out(
        table(
          ["Field", "Nilai"],
          [
            ["Status", `${response.status} ${response.statusText}`],
            ["Metode", method],
            ["Waktu", `${elapsed} ms`],
            ["Akhir URL", response.url],
            ["Dialihkan", response.redirected ? "ya" : "tidak"],
            ["Content-Type", response.headers.get("content-type") ?? "(tidak ada)"],
            ["Content-Length", response.headers.get("content-length") ?? "(tidak ada)"],
            ["Server", response.headers.get("server") ?? "(tidak ada)"],
          ],
          { maxWidth: 58 },
        ),
      );
      ctx.out(heading("Header"));
      ctx.out(table(["Nama", "Nilai"], headers.map(([key, value]) => [key, value]), { maxWidth: 64 }));
      ctx.out(muted("Badan respons tidak ditampilkan."));
    },
  },
  {
    id: "dns",
    category: "Developer",
    summary: "Resolve record DNS untuk A, AAAA, MX, TXT, NS, atau CNAME.",
    usage: "iky dns example.com [A]",
    fields: [
      { key: "host", label: "Hostname", type: "text", required: true },
      {
        key: "type",
        label: "Tipe record",
        type: "select",
        choices: ["A", "AAAA", "MX", "TXT", "NS", "CNAME"].map((value) => ({ value, label: value })),
        required: true,
      },
    ],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan hostname.", "iky dns example.com A");
      return { host: args[0], type: (args[1] ?? "A").toUpperCase() };
    },
    async run(input, ctx) {
      const host = fromInput(input, "host", ctx, "iky dns").trim();
      const type = String(input.type || "A").toUpperCase();
      const resolvers = {
        A: () => dns.resolve4(host),
        AAAA: () => dns.resolve6(host),
        MX: () => dns.resolveMx(host),
        TXT: () => dns.resolveTxt(host),
        NS: () => dns.resolveNs(host),
        CNAME: () => dns.resolveCname(host),
      };
      if (!(type in resolvers)) throw new UserError(`Tipe record tidak didukung: ${type}`);
      let records;
      let fallback = false;
      try {
        records = await resolvers[type]();
      } catch (error) {
        if ((type === "A" || type === "AAAA") && (error.code === "ENOTFOUND" || error.code === "ENODATA")) {
          try {
            const family = type === "A" ? 4 : 6;
            const lookedUp = await dns.lookup(host, { all: true, family });
            records = lookedUp.map((record) => record.address);
            fallback = true;
          } catch {
            throw new UserError(`Resolve ${type} gagal untuk ${host}: ${error.code ?? error.message}`);
          }
        } else {
          throw new UserError(`Resolve ${type} gagal untuk ${host}: ${error.code ?? error.message}`);
        }
      }
      ctx.out(heading(`DNS ${type}: ${host}`));
      records = [...new Set(records)];
      if (!records.length) {
        ctx.out("Tidak ada record yang dikembalikan.");
        return;
      }
      if (type === "MX") {
        ctx.out(table(["Prioritas", "Host"], records.map((record) => [String(record.priority), record.exchange])));
      } else if (type === "TXT") {
        records.forEach((chunks, index) => ctx.out(`${index + 1}. ${chunks.join("")}`));
      } else {
        records.forEach((record, index) => ctx.out(`${index + 1}. ${record}`));
      }
      ctx.out(muted(`${records.length} record · resolver sistem`));
      if (fallback) ctx.out(note("Record A/AAAA diambil dari resolver lokal dan hosts file."));
    },
  },
  {
    id: "regex",
    category: "Developer",
    summary: "Uji pola regex dan lihat semua kecocokan beserta grupnya.",
    usage: 'iky regex "\\d+" "abc 123" g',
    fields: [
      { key: "pattern", label: "Pola regex", type: "text", required: true },
      { key: "text", label: "Teks", type: "multiline", required: true },
      { key: "flags", label: "Flag", type: "text", default: "g", required: false },
    ],
    parse(args) {
      if (args.length < 2) {
        throw new UserError("Butuh pola dan teks.", 'iky regex "\\d+" "abc 123" g');
      }
      return { pattern: args[0], text: args[1], flags: args[2] ?? "g" };
    },
    async run(input, ctx) {
      const pattern = fromInput(input, "pattern", ctx, "iky regex");
      let flags = String(input.flags || "g");
      if (!/^[dgimsuvy]*$/.test(flags)) throw new UserError(`Flag regex tidak valid: ${flags}`);
      let regex;
      try {
        regex = new RegExp(pattern, flags);
      } catch (error) {
        throw new UserError(`Regex tidak valid: ${error.message}`);
      }
      const scanning = regex.global ? regex : new RegExp(regex.source, `${flags}g`);
      const matches = [...String(input.text).matchAll(scanning)];
      if (!matches.length) {
        ctx.out(bad("Tidak ada kecocokan."));
        return;
      }
      ctx.out(`${good(`${formatNumber(matches.length)} kecocokan`)} untuk /${pattern}/${flags}`);
      matches.forEach((match, index) => {
        const groups = match.slice(1).map((group, groupIndex) => `$${groupIndex + 1}=${group ?? "undefined"}`);
        ctx.out(
          `${String(index + 1).padStart(3)}. [${match.index}] ${JSON.stringify(match[0])}${
            groups.length ? `  ${muted(groups.join("  "))}` : ""
          }`,
        );
      });
    },
  },
  {
    id: "md-toc",
    category: "Developer",
    summary: "Buat daftar isi Markdown dari heading, dengan anchor ala GitHub.",
    usage: "iky md-toc README.md",
    fields: [
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
      { key: "text", label: "Markdown", type: "multiline", required: true, when: (input) => input.source !== "file" },
      { key: "path", label: "Path file", type: "path", required: true, when: (input) => input.source === "file" },
    ],
    async parse(args, ctx) {
      const flag = extractFlag(args, "--file", "-f");
      if (flag.value) return { source: "file", path: flag.value, text: "" };
      if (args.length === 1 && (await pathExists(args[0]))) {
        return { source: "file", path: args[0], text: "" };
      }
      if (ctx.stdinText?.length) return { source: "text", text: ctx.stdinText, path: "" };
      if (!args.length) throw new UserError("Masukkan file Markdown atau teks.", "iky md-toc README.md");
      return { source: "text", text: args.join(" "), path: "" };
    },
    async run(input, ctx) {
      const markdown =
        input.source === "file" ? await readTextFile(fromInput(input, "path", ctx, "iky md-toc")) : fromInput(input, "text", ctx, "iky md-toc");
      const toc = markdownToc(markdown);
      if (!toc.count) {
        ctx.out("Tidak ada heading Markdown yang ditemukan.");
        return;
      }
      ctx.out(toc.markdown);
      ctx.out("");
      ctx.out(muted(`${toc.count} heading.`));
    },
  },
];
