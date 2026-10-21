const length = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const mass = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  ton: 1000,
  oz: 0.028349523125,
  lb: 0.45359237,
};

const data = {
  b: 1,
  byte: 1,
  kb: 1024,
  kib: 1024,
  mb: 1024 ** 2,
  mib: 1024 ** 2,
  gb: 1024 ** 3,
  gib: 1024 ** 3,
  tb: 1024 ** 4,
  tib: 1024 ** 4,
};

export const unitGroups = {
  panjang: length,
  massa: mass,
  data,
  suhu: { c: 1, f: 1, k: 1 },
};

const aliases = {
  panjang: ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"],
  massa: ["mg", "g", "kg", "ton", "oz", "lb"],
  data: ["b", "byte", "kb", "kib", "mb", "mib", "gb", "gib", "tb", "tib"],
  suhu: ["c", "f", "k"],
};

export function detectUnitGroup(unit) {
  const key = String(unit).toLowerCase();
  return Object.entries(aliases).find(([, units]) => units.includes(key))?.[0] ?? null;
}

export function convertUnit(value, from, to) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Nilai harus berupa angka.");
  const fromKey = String(from).toLowerCase();
  const toKey = String(to).toLowerCase();
  const group = detectUnitGroup(fromKey);
  if (!group) throw new Error(`Satuan tidak dikenal: ${from}`);
  if (detectUnitGroup(toKey) !== group) {
    throw new Error(`Satuan ${from} dan ${to} bukan satuan sejenis.`);
  }
  if (group === "suhu") return convertTemperature(amount, fromKey, toKey);
  const table = unitGroups[group];
  const base = amount * table[fromKey];
  return base / table[toKey];
}

function convertTemperature(value, from, to) {
  let celsius;
  if (from === "c") celsius = value;
  else if (from === "f") celsius = ((value - 32) * 5) / 9;
  else celsius = value - 273.15;
  if (to === "c") return celsius;
  if (to === "f") return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

export function unitHint() {
  return "panjang: mm cm m km in ft yd mi | massa: mg g kg ton oz lb | suhu: c f k | data: b kb mb gb tb";
}
