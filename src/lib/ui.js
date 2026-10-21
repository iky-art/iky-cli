const enabled = Boolean(
  process.stdout.isTTY &&
    !process.env.NO_COLOR &&
    process.env.TERM !== "dumb",
);

const paint = (code) => (text) => (enabled ? `\u001b[${code}m${text}\u001b[0m` : String(text));

export const color = enabled;
export const bold = paint("1");
export const dim = paint("2");
export const italic = paint("3");
export const accent = paint("38;5;209");
export const teal = paint("38;5;73");
export const good = paint("38;5;78");
export const warn = paint("38;5;214");
export const bad = paint("38;5;203");
export const muted = paint("38;5;244");
export const underline = paint("4");

export function stripAnsi(text) {
  return String(text).replace(/\u001b\[[0-9;]*m/g, "");
}

export function width(text) {
  return Array.from(stripAnsi(text)).reduce((total, char) => {
    const code = char.codePointAt(0);
    if (code === 0x200d || (code >= 0x300 && code <= 0x36f)) return total;
    return total + (code > 0x1100 && isWide(code) ? 2 : 1);
  }, 0);
}

function isWide(code) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

export function truncate(text, max) {
  const plain = stripAnsi(text);
  if (width(plain) <= max) return text;
  let result = "";
  for (const char of plain) {
    if (width(result + char) > max - 1) break;
    result += char;
  }
  return `${result}…`;
}

export function pad(text, size, align = "left") {
  const gap = Math.max(0, size - width(stripAnsi(text)));
  if (align === "right") return `${" ".repeat(gap)}${text}`;
  if (align === "center") {
    const left = Math.floor(gap / 2);
    return `${" ".repeat(left)}${text}${" ".repeat(gap - left)}`;
  }
  return `${text}${" ".repeat(gap)}`;
}

export function table(headers, rows, options = {}) {
  const maxWidth = options.maxWidth ?? 48;
  const columns = headers.length;
  const widths = headers.map((header, index) => {
    const values = rows.map((row) => String(row[index] ?? ""));
    return Math.min(
      maxWidth,
      Math.max(width(stripAnsi(header)), ...values.map((value) => width(stripAnsi(value)))),
    );
  });

  const render = (row, header = false) =>
    row
      .map((cell, index) => {
        const value = truncate(String(cell ?? ""), widths[index]);
        return header ? bold(pad(value, widths[index])) : pad(value, widths[index]);
      })
      .join("  ")
      .replace(/\s+$/, "");

  const lines = [render(headers, true)];
  lines.push(rows.length ? "─".repeat(Math.min(width(stripAnsi(lines[0])), 120)) : "");
  for (const row of rows) lines.push(render(row));
  return lines.filter((line, index) => index !== 1 || line).join("\n");
}

export function heading(text) {
  return `${accent("▍")} ${bold(text)}`;
}

export function label(text) {
  return muted(text);
}

export function value(text) {
  return String(text);
}

export function success(text) {
  return `${good("✓")} ${text}`;
}

export function failure(text) {
  return `${bad("✕")} ${text}`;
}

export function note(text) {
  return `${warn("!")} ${text}`;
}

export function bullet(text) {
  return `${muted("·")} ${text}`;
}

export function rule(size = 52) {
  return muted("─".repeat(size));
}
