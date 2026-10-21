import fs from "node:fs/promises";
import path from "node:path";

export function formatBytes(bytes, precision = 1) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "?";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : precision)} ${units[index]}`;
}

export function formatNumber(value, locale = "id-ID", maximumFractionDigits = 8) {
  if (!Number.isFinite(Number(value))) return String(value);
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(Number(value));
}

export function formatDuration(seconds, style = "long") {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts = [];
  if (days) parts.push(`${days} hari`);
  if (hours) parts.push(`${hours} jam`);
  if (minutes) parts.push(`${minutes} menit`);
  if (!days && !hours) parts.push(`${secs} detik`);
  if (style === "short") return parts.join(" ");
  return parts.join(" ");
}

export function formatDate(date, options = {}) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "?";
  return new Intl.DateTimeFormat(options.locale ?? "id-ID", {
    dateStyle: "full",
    timeStyle: options.time ? "medium" : undefined,
    timeZone: options.timeZone,
  }).format(value);
}

export function isoLocal(date) {
  const value = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(Math.abs(n)).padStart(2, "0");
  const offset = -value.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}:${pad(value.getSeconds())}${sign}${pad(
    Math.floor(Math.abs(offset) / 60),
  )}:${pad(Math.abs(offset) % 60)}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const entities = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  hellip: "…",
  mdash: "\u2014",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  deg: "°",
  middot: "·",
  bull: "•",
};

export function unescapeHtml(value) {
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return entities[body.toLowerCase()] ?? match;
  });
}

export function slugify(value, separator = "-") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`\\${separator}+`, "g"), separator)
    .replace(new RegExp(`^\\${separator}|\\${separator}$`, "g"), "");
}

export function wordsOf(value) {
  const segmenter = new Intl.Segmenter("id", { granularity: "word" });
  return [...segmenter.segment(String(value))]
    .filter((part) => part.isWordLike)
    .map((part) => part.segment);
}

export function graphemes(value) {
  const segmenter = new Intl.Segmenter("id", { granularity: "grapheme" });
  return [...segmenter.segment(String(value))].map((part) => part.segment);
}

export function closest(value, choices) {
  let best = null;
  let bestScore = Infinity;
  for (const choice of choices) {
    const score = levenshtein(value, choice);
    if (score < bestScore) {
      best = choice;
      bestScore = score;
    }
  }
  return bestScore <= Math.max(2, Math.floor(value.length / 3)) ? best : null;
}

export function levenshtein(a, b) {
  const left = Array.from(String(a).toLowerCase());
  const right = Array.from(String(b).toLowerCase());
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[left.length][right.length];
}

export async function readTextFile(filePath, cwd = process.cwd()) {
  const resolved = path.resolve(cwd, filePath);
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) throw new Error(`Bukan file: ${resolved}`);
  return fs.readFile(resolved, "utf8");
}

export async function pathExists(filePath, cwd = process.cwd()) {
  try {
    await fs.access(path.resolve(cwd, filePath));
    return true;
  } catch {
    return false;
  }
}

export function detectMime(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return mimeTypes[extension] ?? "application/octet-stream";
}

const mimeTypes = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".cjs": "text/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".tar": "application/x-tar",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".sh": "application/x-sh",
  ".toml": "application/toml",
  ".ini": "text/plain",
};
