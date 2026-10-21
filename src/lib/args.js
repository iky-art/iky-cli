export class UserError extends Error {
  constructor(message, usage = null) {
    super(message);
    this.name = "UserError";
    this.usage = usage;
  }
}

export function requireValue(value, message, usage) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new UserError(message, usage);
  }
  return value;
}

export function toNumber(value, label = "Nilai") {
  const number = Number(String(value).replace(",", "."));
  if (!Number.isFinite(number)) throw new UserError(`${label} harus berupa angka.`);
  return number;
}

export function toInteger(value, label = "Nilai") {
  const number = toNumber(value, label);
  if (!Number.isInteger(number)) throw new UserError(`${label} harus berupa bilangan bulat.`);
  return number;
}

export function extractFlag(args, ...names) {
  const copy = [...args];
  for (let index = 0; index < copy.length; index += 1) {
    const token = copy[index];
    const equal = token.match(/^(--[a-z0-9-]+)=(.*)$/i);
    if (equal && names.includes(equal[1])) {
      copy.splice(index, 1);
      return { value: equal[2], args: copy };
    }
    if (names.includes(token)) {
      const value = copy[index + 1];
      copy.splice(index, 2);
      return { value, args: copy };
    }
  }
  return { value: undefined, args: copy };
}

export function hasFlag(args, ...names) {
  return args.some((token) => names.includes(token));
}

export function removeFlags(args, ...names) {
  return args.filter((token) => !names.includes(token) && !names.some((name) => token.startsWith(`${name}=`)));
}

export function listFromArgs(args) {
  const joined = args.join(" ").trim();
  if (!joined) return [];
  if (joined.includes(",")) {
    return joined
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return args.map((part) => part.trim()).filter(Boolean);
}
