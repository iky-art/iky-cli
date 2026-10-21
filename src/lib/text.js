import { width } from "./ui.js";
import { graphemes, wordsOf } from "./format.js";

export function countText(text) {
  const value = String(text);
  const graphemeList = graphemes(value);
  const wordList = wordsOf(value);
  const lines = value === "" ? 0 : value.split(/\r?\n/).length;
  const paragraphs = value.trim() === "" ? 0 : value.trim().split(/\n\s*\n/).filter(Boolean).length;
  const sentences = value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && /\p{L}|\p{N}/u.test(part)).length;
  const readingMinutes = wordList.length / 200;
  return {
    characters: graphemeList.length,
    charactersNoSpaces: graphemeList.filter((char) => !/\s/.test(char)).length,
    words: wordList.length,
    lines,
    paragraphs,
    sentences,
    readingMinutes,
  };
}

export function splitWords(value) {
  return String(value)
    .normalize("NFC")
    .replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function convertCase(value, mode) {
  const text = String(value);
  const parts = splitWords(text);
  const lower = text.toLocaleLowerCase("id-ID");
  const upper = text.toLocaleUpperCase("id-ID");
  if (mode === "lower") return lower;
  if (mode === "upper") return upper;
  if (mode === "title") {
    return parts
      .map((word) => word.charAt(0).toLocaleUpperCase("id-ID") + word.slice(1).toLocaleLowerCase("id-ID"))
      .join(" ");
  }
  if (mode === "sentence") {
    const normalized = lower.replace(/\s+/g, " ").trim();
    return normalized.replace(/(^\s*[a-z]|[.!?]\s+[a-z])/gi, (match) => match.toLocaleUpperCase("id-ID"));
  }
  if (mode === "camel") {
    return parts
      .map((word, index) => {
        const clean = word.toLocaleLowerCase("id-ID");
        return index === 0 ? clean : clean.charAt(0).toUpperCase() + clean.slice(1);
      })
      .join("");
  }
  if (mode === "pascal") {
    return parts
      .map((word) => {
        const clean = word.toLocaleLowerCase("id-ID");
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      })
      .join("");
  }
  if (mode === "snake") return parts.map((word) => word.toLowerCase()).join("_");
  if (mode === "kebab") return parts.map((word) => word.toLowerCase()).join("-");
  if (mode === "constant") return parts.map((word) => word.toUpperCase()).join("_");
  throw new Error(`Mode case tidak dikenal: ${mode}`);
}

export function wrapText(text, maxWidth = 80) {
  const limit = Math.max(10, Number(maxWidth) || 80);
  return String(text)
    .split(/\r?\n/)
    .map((paragraph) => {
      if (paragraph.trim() === "") return "";
      const words = paragraph.trim().split(/\s+/);
      const lines = [];
      let current = "";
      for (const word of words) {
        if (width(word) > limit) {
          if (current) {
            lines.push(current);
            current = "";
          }
          let chunk = "";
          for (const char of word) {
            if (width(chunk + char) > limit) {
              lines.push(chunk);
              chunk = char;
            } else {
              chunk += char;
            }
          }
          current = chunk;
          continue;
        }
        const candidate = current ? `${current} ${word}` : word;
        if (width(candidate) > limit) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
      return lines.join("\n");
    })
    .join("\n");
}

export function uniqueLines(text) {
  const seen = new Set();
  return String(text)
    .split(/\r?\n/)
    .filter((line) => {
      if (line.trim() === "") return true;
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join("\n");
}

export function transformLines(text, action) {
  const lines = String(text).split(/\r?\n/);
  if (action === "urutkan") {
    return [...lines].sort((a, b) => a.localeCompare(b, "id", { numeric: true })).join("\n");
  }
  if (action === "unik") return uniqueLines(text);
  if (action === "trim") return lines.map((line) => line.trim()).join("\n");
  if (action === "balik") return [...lines].reverse().join("\n");
  if (action === "nomor") {
    const widthOfNumber = String(lines.length).length;
    return lines.map((line, index) => `${String(index + 1).padStart(widthOfNumber, " ")}. ${line}`).join("\n");
  }
  if (action === "rapatkan") {
    return lines
      .reduce((result, line) => {
        if (line.trim() === "" && result.at(-1)?.trim() === "") return result;
        result.push(line);
        return result;
      }, [])
      .join("\n");
  }
  throw new Error(`Aksi lines tidak dikenal: ${action}`);
}

export function lineDiff(leftText, rightText) {
  const left = String(leftText).split(/\r?\n/);
  const right = String(rightText).split(/\r?\n/);
  if (left.length * right.length > 4_000_000) {
    throw new Error("Teks terlalu besar untuk diff baris. Maksimal sekitar 2000 x 2000 baris.");
  }
  const table = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      result.push({ type: "same", value: left[i], left: i + 1, right: j + 1 });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ type: "del", value: left[i], left: i + 1 });
      i += 1;
    } else {
      result.push({ type: "add", value: right[j], right: j + 1 });
      j += 1;
    }
  }
  while (i < left.length) {
    result.push({ type: "del", value: left[i], left: i + 1 });
    i += 1;
  }
  while (j < right.length) {
    result.push({ type: "add", value: right[j], right: j + 1 });
    j += 1;
  }
  return result;
}

const stopwords = new Set(
  [
    "yang",
    "dan",
    "di",
    "ke",
    "dari",
    "untuk",
    "dengan",
    "pada",
    "adalah",
    "ini",
    "itu",
    "atau",
    "juga",
    "akan",
    "tidak",
    "bisa",
    "dalam",
    "sebagai",
    "karena",
    "sudah",
    "saya",
    "kamu",
    "anda",
    "kita",
    "kami",
    "mereka",
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "are",
    "was",
    "were",
    "you",
    "your",
    "have",
    "has",
    "not",
    "but",
    "all",
    "can",
    "will",
    "our",
    "their",
    "its",
    "about",
    "into",
    "over",
    "than",
    "then",
    "them",
  ].map((word) => word.toLowerCase()),
);

export function wordFrequency(text, limit = 10, useStopwords = true) {
  const counts = new Map();
  for (const word of wordsOf(text)) {
    const normalized = word.toLocaleLowerCase("id-ID");
    if (normalized.length < 3) continue;
    if (useStopwords && stopwords.has(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 10)))
    .map(([word, count]) => ({ word, count }));
}

export function markdownToc(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const entries = [];
  const used = new Map();
  let inFence = false;
  let fenceMarker = "";
  for (const line of lines) {
    const fence = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!heading) continue;
    const level = heading[1].length;
    const plain = heading[2]
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!plain) continue;
    const base = plain
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const anchor = seen === 0 ? base : `${base}-${seen}`;
    entries.push({ level, text: plain, anchor });
  }
  if (!entries.length) return { markdown: "", count: 0 };
  const minimum = Math.min(...entries.map((entry) => entry.level));
  return {
    count: entries.length,
    markdown: entries
      .map((entry) => `${"  ".repeat(entry.level - minimum)}- [${entry.text}](#${entry.anchor})`)
      .join("\n"),
  };
}

export function parseJsonPath(pathText) {
  const tokens = [];
  const source = String(pathText).trim();
  if (!source) return tokens;
  const pattern = /([^.[\]]+)|\[(?:(\d+)|\*|"([^"]*)"|'([^']*)')\]/g;
  let match;
  while ((match = pattern.exec(source))) {
    if (match[1] !== undefined) tokens.push({ type: "key", value: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "index", value: Number(match[2]) });
    else if (match[3] !== undefined || match[4] !== undefined) {
      tokens.push({ type: "key", value: match[3] ?? match[4] });
    } else tokens.push({ type: "wildcard" });
  }
  return tokens;
}

export function queryJson(value, tokens) {
  let current = [value];
  for (const token of tokens) {
    const next = [];
    for (const item of current) {
      if (token.type === "key") {
        if (item && typeof item === "object" && token.value in item) next.push(item[token.value]);
      } else if (token.type === "index") {
        if (Array.isArray(item) && token.value < item.length) next.push(item[token.value]);
      } else if (token.type === "wildcard") {
        if (Array.isArray(item)) next.push(...item);
        else if (item && typeof item === "object") next.push(...Object.values(item));
      }
    }
    current = next;
  }
  return current;
}

const morse = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "!": "-.-.--",
  "-": "-....-",
  "/": "-..-.",
  "@": ".--.-.",
  ":": "---...",
  "'": ".----.",
  "(": "-.--.",
  ")": "-.--.-",
};

const morseReverse = Object.fromEntries(Object.entries(morse).map(([key, value]) => [value, key]));

export function toMorse(text) {
  return String(text)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from(word)
        .map((char) => {
          if (!(char in morse)) throw new Error(`Karakter tidak didukung morse: ${char}`);
          return morse[char];
        })
        .join(" "),
    )
    .join(" / ");
}

export function fromMorse(text) {
  return String(text)
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => {
          if (!(code in morseReverse)) throw new Error(`Kode morse tidak dikenal: ${code}`);
          return morseReverse[code];
        })
        .join(""),
    )
    .join(" ");
}
