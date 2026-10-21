import { UserError, requireValue } from "../lib/args.js";

export function textFromArgs(args, ctx, usage) {
  const joined = args.join(" ").trim();
  if (joined) return args.join(" ");
  if (ctx.stdinText && ctx.stdinText.length) return ctx.stdinText.replace(/\n$/, "");
  throw new UserError("Masukkan teks.", usage);
}

export function fromInput(input, key, ctx, usage) {
  const value = requireValue(input[key], "Masukkan teks.", usage);
  return String(value);
}

export function parseSourceArgs(args, ctx, usage) {
  if (ctx.stdinText && ctx.stdinText.length) return { text: ctx.stdinText.replace(/\n$/, "") };
  if (!args.length) throw new UserError("Masukkan teks.", usage);
  return { text: args.join(" ") };
}
