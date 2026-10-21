import os from "node:os";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { table, heading, note, muted } from "../lib/ui.js";
import { formatBytes, formatDuration } from "../lib/format.js";
import { UserError, extractFlag, toInteger } from "../lib/args.js";

export const systemCommands = [
  {
    id: "info",
    category: "Sistem",
    summary: "Ringkasan sistem operasi, CPU, memori, dan runtime.",
    usage: "iky info",
    fields: [],
    async run(_input, ctx) {
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model?.trim() || "Tidak diketahui";
      ctx.out(heading("Informasi sistem"));
      ctx.out(
        table(
          ["Field", "Nilai"],
          [
            ["Hostname", os.hostname()],
            ["Sistem", `${os.type()} ${os.release()}`],
            ["Platform", `${os.platform()} ${os.arch()}`],
            ["CPU", cpuModel],
            ["Core", String(cpus.length)],
            ["Memori", `${formatBytes(os.freemem())} bebas dari ${formatBytes(os.totalmem())}`],
            ["Uptime", formatDuration(os.uptime())],
            ["Node", process.version],
            ["Shell", process.env.SHELL ?? process.env.ComSpec ?? "Tidak diketahui"],
            ["Lokasi", process.cwd()],
            ["Zona waktu", Intl.DateTimeFormat().resolvedOptions().timeZone],
          ],
          { maxWidth: 58 },
        ),
      );
      ctx.out(note("Memori dihitung dari sudut pandang proses, bukan total pemakaian seluruh aplikasi."));
    },
  },
  {
    id: "disk",
    category: "Sistem",
    summary: "Pemakaian disk untuk sebuah path.",
    usage: "iky disk [path]",
    fields: [{ key: "target", label: "Path", type: "path", default: ".", required: false }],
    parse(args) {
      return { target: args.join(" ") || "." };
    },
    async run(input, ctx) {
      const target = path.resolve(input.target || ".");
      const stat = await fs.stat(target).catch(() => {
        throw new UserError(`Path tidak ditemukan: ${target}`);
      });
      const stats = await fs.statfs(target);
      const blockSize = Number(stats.bsize);
      const total = Number(stats.blocks) * blockSize;
      const free = Number(stats.bfree) * blockSize;
      const available = Number(stats.bavail) * blockSize;
      const used = total - free;
      const percent = total === 0 ? 0 : (used / total) * 100;
      ctx.out(heading(`Disk: ${target}`));
      ctx.out(
        table(
          ["Ukuran", "Nilai"],
          [
            ["Total", formatBytes(total)],
            ["Terpakai", formatBytes(used)],
            ["Bebas", formatBytes(free)],
            ["Tersedia", formatBytes(available)],
            ["Persentase", `${percent.toFixed(1)}%`],
            ["Tipe path", stat.isDirectory() ? "direktori" : "file"],
          ],
        ),
      );
    },
  },
  {
    id: "env",
    category: "Sistem",
    summary: "Cari environment variable dengan nilai sensitif disamarkan.",
    usage: "iky env [kata-kunci]",
    fields: [{ key: "filter", label: "Filter (opsional)", type: "text", required: false }],
    parse(args) {
      return { filter: args.join(" ") };
    },
    async run(input, ctx) {
      const filter = String(input.filter ?? "").trim().toLowerCase();
      const entries = Object.entries(process.env)
        .filter(([key]) => (filter ? key.toLowerCase().includes(filter) : true))
        .sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) {
        ctx.out(`Tidak ada environment variable yang cocok dengan "${filter}".`);
        return;
      }
      const sensitive = /(KEY|TOKEN|SECRET|PASSWORD|PASS|AUTH|CREDENTIAL|COOKIE|SESSION|SALT)/i;
      const rows = entries.slice(0, 300).map(([key, value]) => [
        key,
        sensitive.test(key) ? muted("(disamarkan)") : String(value ?? "").slice(0, 100),
      ]);
      ctx.out(heading(filter ? `Environment: ${filter}` : "Environment"));
      ctx.out(table(["Nama", "Nilai"], rows, { maxWidth: 70 }));
      if (entries.length > 300) ctx.out(note(`Ditampilkan 300 dari ${entries.length} variabel.`));
      ctx.out(note("Nilai dengan nama yang tampak sensitif selalu disamarkan."));
    },
  },
  {
    id: "ip",
    category: "Sistem",
    summary: "Alamat IP lokal pada setiap antarmuka jaringan.",
    usage: "iky ip",
    fields: [],
    async run(_input, ctx) {
      const interfaces = os.networkInterfaces();
      const rows = [];
      for (const [name, addresses] of Object.entries(interfaces)) {
        for (const address of addresses ?? []) {
          rows.push([
            name,
            address.family === "IPv4" ? "IPv4" : "IPv6",
            address.address,
            address.internal ? "internal" : "publik lokal",
            address.mac && address.mac !== "00:00:00:00:00:00" ? address.mac : "-",
          ]);
        }
      }
      ctx.out(heading("Alamat IP lokal"));
      if (!rows.length) {
        ctx.out("Tidak ada antarmuka jaringan yang terdeteksi.");
        return;
      }
      ctx.out(table(["Antarmuka", "Keluarga", "Alamat", "Cakupan", "MAC"], rows, { maxWidth: 42 }));
    },
  },
  {
    id: "port",
    category: "Sistem",
    summary: "Periksa apakah sebuah port TCP menerima koneksi.",
    usage: "iky port [host] <port>",
    fields: [
      { key: "host", label: "Host", type: "text", default: "127.0.0.1", required: true },
      { key: "port", label: "Port", type: "number", required: true, min: 1, max: 65535 },
    ],
    parse(args) {
      if (!args.length) throw new UserError("Masukkan port.", "iky port [host] <port>");
      if (args.length === 1) return { host: "127.0.0.1", port: toInteger(args[0], "Port") };
      return { host: args[0], port: toInteger(args[1], "Port") };
    },
    async run(input, ctx) {
      const host = input.host || "127.0.0.1";
      const port = toInteger(input.port, "Port");
      if (port < 1 || port > 65535) throw new UserError("Port harus antara 1 dan 65535.");
      const result = await checkPort(host, port, 3000);
      if (result.open) {
        ctx.out(`${host}:${port} terbuka. Koneksi TCP diterima dalam ${result.ms} ms.`);
      } else if (result.timeout) {
        ctx.out(`${host}:${port} tidak menjawab dalam 3 detik. Bisa jadi filter firewall.`);
      } else {
        ctx.out(`${host}:${port} tertutup atau tidak ada layanan. (${result.error})`);
      }
    },
  },
  {
    id: "process",
    category: "Sistem",
    summary: "Detail proses Node yang sedang menjalankan CLI.",
    usage: "iky process",
    fields: [],
    async run(_input, ctx) {
      const memory = process.memoryUsage();
      ctx.out(heading("Proses saat ini"));
      ctx.out(
        table(
          ["Field", "Nilai"],
          [
            ["PID", String(process.pid)],
            ["PPID", String(process.ppid)],
            ["Judul", process.title || "(tidak diatur)"],
            ["Runtime", formatDuration(process.uptime())],
            ["Exec path", process.execPath],
            ["Argumen", process.argv.slice(1).join(" ") || "-"],
            ["RSS", formatBytes(memory.rss)],
            ["Heap terpakai", formatBytes(memory.heapUsed)],
            ["Heap total", formatBytes(memory.heapTotal)],
            ["External", formatBytes(memory.external)],
          ],
          { maxWidth: 62 },
        ),
      );
    },
  },
];

function checkPort(host, port, timeout) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, ms: Date.now() - started });
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish({ open: true }));
    socket.once("timeout", () => finish({ open: false, timeout: true, error: "timeout" }));
    socket.once("error", (error) => finish({ open: false, error: error.code ?? error.message }));
  });
}
