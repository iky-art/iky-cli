function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function parseColor(input) {
  const text = String(input).trim().toLowerCase();
  if (text.startsWith("#")) return parseHex(text);
  const rgbMatch = text.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) return parseRgbParts(rgbMatch[1]);
  const hslMatch = text.match(/^hsla?\(([^)]+)\)$/);
  if (hslMatch) return parseHslParts(hslMatch[1]);
  const bare = text.match(/^([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (bare) return parseHex(`#${bare[1]}`);
  throw new Error(`Warna tidak dikenal: ${input}. Gunakan #hex, rgb(), atau hsl().`);
}

function parseHex(text) {
  const hex = text.slice(1);
  if (![3, 6, 8].includes(hex.length) || !/^[0-9a-f]+$/.test(hex)) {
    throw new Error(`Hex tidak valid: ${text}`);
  }
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const a = full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function parseRgbParts(parts) {
  const pieces = parts
    .replaceAll("/", " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (pieces.length < 3) throw new Error("rgb() butuh tiga komponen.");
  const channel = (piece) => {
    const number = piece.endsWith("%")
      ? (Number.parseFloat(piece) / 100) * 255
      : Number.parseFloat(piece);
    if (!Number.isFinite(number)) throw new Error(`Komponen rgb tidak valid: ${piece}`);
    return Math.round(clamp(number, 0, 255));
  };
  const alpha = pieces[3] === undefined ? 1 : parseAlpha(pieces[3]);
  return { r: channel(pieces[0]), g: channel(pieces[1]), b: channel(pieces[2]), a: alpha };
}

function parseHslParts(parts) {
  const pieces = parts
    .replaceAll("/", " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (pieces.length < 3) throw new Error("hsl() butuh tiga komponen.");
  const hue = Number.parseFloat(pieces[0]);
  const saturation = Number.parseFloat(pieces[1]) / 100;
  const lightness = Number.parseFloat(pieces[2]) / 100;
  if (![hue, saturation, lightness].every(Number.isFinite)) throw new Error("Komponen hsl tidak valid.");
  const alpha = pieces[3] === undefined ? 1 : parseAlpha(pieces[3]);
  const rgb = hslToRgb(hue, clamp(saturation, 0, 1), clamp(lightness, 0, 1));
  return { ...rgb, a: alpha };
}

function parseAlpha(piece) {
  const number = piece.endsWith("%") ? Number.parseFloat(piece) / 100 : Number.parseFloat(piece);
  if (!Number.isFinite(number)) throw new Error(`Alpha tidak valid: ${piece}`);
  return clamp(number, 0, 1);
}

export function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return {
    h: Math.round(hue),
    s: Math.round(saturation * 1000) / 10,
    l: Math.round(lightness * 1000) / 10,
  };
}

function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (h < 60) [red, green, blue] = [c, x, 0];
  else if (h < 120) [red, green, blue] = [x, c, 0];
  else if (h < 180) [red, green, blue] = [0, c, x];
  else if (h < 240) [red, green, blue] = [0, x, c];
  else if (h < 300) [red, green, blue] = [x, 0, c];
  else [red, green, blue] = [c, 0, x];
  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  };
}

export function toHex(color, includeAlpha = false) {
  const hex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  const base = `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
  return includeAlpha && color.a < 1 ? `${base}${hex(color.a * 255)}` : base;
}

export function toRgbString(color) {
  if (color.a < 1) return `rgba(${color.r}, ${color.g}, ${color.b}, ${Number(color.a.toFixed(3))})`;
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function toHslString(color) {
  const hsl = rgbToHsl(color);
  if (color.a < 1) {
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${Number(color.a.toFixed(3))})`;
  }
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

function channelLuminance(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color) {
  return (
    0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b)
  );
}

export function contrastRatio(foreground, background) {
  const fg = composite(foreground, background);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function composite(foreground, background) {
  if (foreground.a >= 1) return foreground;
  const alpha = foreground.a;
  return {
    r: Math.round(foreground.r * alpha + background.r * (1 - alpha)),
    g: Math.round(foreground.g * alpha + background.g * (1 - alpha)),
    b: Math.round(foreground.b * alpha + background.b * (1 - alpha)),
    a: 1,
  };
}

export function contrastLabel(ratio) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA besar";
  return "gagal";
}
