import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { accent, bold, muted, bad } from "./ui.js";
import { UserError, toInteger, toNumber } from "./args.js";

export function createPrompt() {
  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: Boolean(stdin.isTTY) });
  let closed = false;
  rl.on("SIGINT", () => {
    if (!closed) {
      closed = true;
      rl.close();
      stdout.write("\n");
      process.exit(130);
    }
  });

  async function ask(question, options = {}) {
    const defaultValue = options.defaultValue;
    const suffix =
      defaultValue !== undefined && defaultValue !== null && String(defaultValue) !== ""
        ? muted(` [${defaultValue}]`)
        : "";
    while (true) {
      let answer;
      try {
        answer = await rl.question(`${accent("›")} ${bold(question)}${suffix} `);
      } catch {
        if (closed) process.exit(130);
        throw new UserError("Input dibatalkan.");
      }
      const value = answer.trim() === "" ? (defaultValue ?? "") : answer.trim();
      if (options.required && String(value).trim() === "") {
        stdout.write(`${bad("Nilai wajib diisi.")}\n`);
        continue;
      }
      return String(value);
    }
  }

  async function select(question, choices, options = {}) {
    if (!choices.length) throw new UserError(`Tidak ada pilihan untuk ${question}.`);
    const fallback = options.defaultValue ?? choices[0].value;
    stdout.write(`${accent("›")} ${bold(question)}\n`);
    choices.forEach((choice, index) => {
      const marker = choice.value === fallback ? accent("●") : muted("○");
      stdout.write(`  ${muted(String(index + 1).padStart(2))}. ${marker} ${choice.label}\n`);
    });
    while (true) {
      const answer = await ask("Pilih nomor atau nilai", { defaultValue: fallback });
      if (answer === "") return fallback;
      const index = Number(answer);
      if (Number.isInteger(index) && index >= 1 && index <= choices.length) return choices[index - 1].value;
      const direct = choices.find((choice) => String(choice.value) === answer);
      if (direct) return direct.value;
      stdout.write(`${bad(`Pilihan tidak valid: ${answer}`)}\n`);
    }
  }

  async function confirm(question, defaultValue = true) {
    const label = defaultValue ? "Y/n" : "y/N";
    while (true) {
      const answer = (await ask(`${question} (${label})`)).toLowerCase();
      if (answer === "") return defaultValue;
      if (["y", "ya", "yes"].includes(answer)) return true;
      if (["n", "tidak", "no"].includes(answer)) return false;
      stdout.write(`${bad("Jawab y atau n.")}\n`);
    }
  }

  async function multiline(question, options = {}) {
    stdout.write(`${accent("›")} ${bold(question)}\n`);
    stdout.write(muted("  Tulis beberapa baris, lalu ketik . pada baris baru untuk selesai.\n"));
    const lines = [];
    while (true) {
      let line;
      try {
        line = await rl.question(muted("  │ "));
      } catch {
        if (closed) process.exit(130);
        throw new UserError("Input dibatalkan.");
      }
      if (line.trim() === ".") break;
      lines.push(line);
    }
    const value = lines.join("\n");
    if (options.required && value.trim() === "") {
      stdout.write(`${bad("Nilai wajib diisi.")}\n`);
      return multiline(question, options);
    }
    return value;
  }

  async function pause(message = "Tekan Enter untuk kembali") {
    try {
      await rl.question(muted(`  ${message} `));
    } catch {
      if (closed) process.exit(130);
    }
  }

  function close() {
    if (!closed) {
      closed = true;
      rl.close();
    }
  }

  return { ask, select, confirm, multiline, pause, close };
}

export async function collectFields(command, prompt) {
  const values = {};
  for (const field of command.fields) {
    if (field.when && !field.when(values)) continue;
    let value;
    if (field.type === "select") {
      value = await prompt.select(field.label, field.choices, { defaultValue: field.default });
    } else if (field.type === "confirm") {
      value = await prompt.confirm(field.label, field.default ?? true);
    } else if (field.type === "multiline") {
      value = await prompt.multiline(field.label, { required: field.required });
    } else if (field.type === "number" || field.type === "decimal") {
      while (true) {
        const raw = await prompt.ask(field.label, {
          defaultValue: field.default,
          required: field.required,
        });
        if (String(raw).trim() === "" && !field.required) {
          value = undefined;
          break;
        }
        try {
          value = field.type === "decimal" ? toNumber(raw, field.label) : toInteger(raw, field.label);
        } catch (error) {
          stdout.write(`${bad(error.message)}\n`);
          continue;
        }
        if (field.min !== undefined && value < field.min) {
          stdout.write(`${bad(`${field.label} minimal ${field.min}.`)}\n`);
          continue;
        }
        if (field.max !== undefined && value > field.max) {
          stdout.write(`${bad(`${field.label} maksimal ${field.max}.`)}\n`);
          continue;
        }
        break;
      }
    } else {
      value = await prompt.ask(field.label, {
        defaultValue: field.default,
        required: field.required,
      });
    }
    values[field.key] = value;
  }
  return values;
}
