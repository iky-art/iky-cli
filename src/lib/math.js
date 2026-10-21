const functions = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  exp: Math.exp,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sign: Math.sign,
  trunc: Math.trunc,
};

const constants = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

function tokenize(input) {
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = input.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      if (!match) throw new Error(`Angka tidak valid di posisi ${index + 1}.`);
      tokens.push({ type: "number", value: Number(match[0]) });
      index += match[0].length;
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      const match = input.slice(index).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      tokens.push({ type: "name", value: match[0] });
      index += match[0].length;
      continue;
    }
    if ("+-*/%^(),".includes(char)) {
      tokens.push({ type: char });
      index += 1;
      continue;
    }
    throw new Error(`Karakter tidak dikenal: ${char}`);
  }
  tokens.push({ type: "eof" });
  return tokens;
}

export function evaluate(expression) {
  const source = String(expression).trim();
  if (!source) throw new Error("Ekspresi kosong.");
  const tokens = tokenize(source);
  let position = 0;

  const peek = () => tokens[position];
  const consume = (type) => {
    if (tokens[position].type !== type) {
      throw new Error(`Diharapkan ${type}, ditemukan ${tokens[position].value ?? tokens[position].type}.`);
    }
    return tokens[position++];
  };

  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 };

  function parsePrimary() {
    const token = peek();
    if (token.type === "number") {
      position += 1;
      return token.value;
    }
    if (token.type === "-") {
      position += 1;
      return -parsePrimary();
    }
    if (token.type === "+") {
      position += 1;
      return parsePrimary();
    }
    if (token.type === "(") {
      position += 1;
      const inner = parseExpression(0);
      consume(")");
      return inner;
    }
    if (token.type === "name") {
      position += 1;
      const name = token.value.toLowerCase();
      if (peek().type === "(") {
        if (!(name in functions)) throw new Error(`Fungsi tidak dikenal: ${token.value}`);
        position += 1;
        const args = [];
        if (peek().type !== ")") {
          args.push(parseExpression(0));
          while (peek().type === ",") {
            position += 1;
            args.push(parseExpression(0));
          }
        }
        consume(")");
        const result = functions[name](...args);
        if (!Number.isFinite(result)) throw new Error(`Hasil ${token.value} tidak valid.`);
        return result;
      }
      if (name in constants) return constants[name];
      throw new Error(`Nama tidak dikenal: ${token.value}`);
    }
    throw new Error(`Token tidak terduga: ${token.value ?? token.type}`);
  }

  function parseExpression(minimum) {
    let left = parsePrimary();
    while (true) {
      const token = peek();
      if (!(token.type in precedence) || precedence[token.type] < minimum) break;
      const operator = token.type;
      position += 1;
      const nextMinimum = operator === "^" ? precedence[operator] : precedence[operator] + 1;
      const right = parseExpression(nextMinimum);
      if (operator === "+") left += right;
      if (operator === "-") left -= right;
      if (operator === "*") left *= right;
      if (operator === "/") {
        if (right === 0) throw new Error("Pembagian dengan nol.");
        left /= right;
      }
      if (operator === "%") {
        if (right === 0) throw new Error("Modulo dengan nol.");
        left %= right;
      }
      if (operator === "^") left **= right;
      if (!Number.isFinite(left)) throw new Error("Hasil melewati batas angka.");
    }
    return left;
  }

  const result = parseExpression(0);
  if (peek().type !== "eof") throw new Error(`Ekspresi belum selesai di ${peek().value ?? peek().type}.`);
  if (!Number.isFinite(result)) throw new Error("Hasil bukan angka yang valid.");
  return result;
}

export function formatMathResult(value) {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 1e15 || (Math.abs(value) < 1e-9 && value !== 0)) return value.toExponential(8);
  return String(Number(value.toPrecision(12)));
}
