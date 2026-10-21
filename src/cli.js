import fs from "node:fs";
import { stdin } from "node:process";
import { createPrompt, collectFields } from "./lib/prompt.js";
import { commandByName, commands, categories, commandsByCategory, searchCommands } from "./registry.js";
import {
  accent,
  bold,
  dim,
  muted,
  good,
  bad,
  note,
  heading,
  table,
  truncate,
} from "./lib/ui.js";
import { UserError } from "./lib/args.js";
import { closest } from "./lib/format.js";

const version = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const logo = `██╗██╗  ██╗██╗   ██╗
██║██║ ██╔╝╚██╗ ██╔╝
██║█████╔╝  ╚████╔╝
██║██╔═██╗   ╚██╔╝
██║██║  ██╗   ██║
╚═╝╚═╝  ╚═╝   ╚═╝`;

export async function main(argv) {
  const args = [...argv];
  if (!args.length) {
    if (stdin.isTTY) {
      await runInteractive();
    } else {
      printHelp();
    }
    return;
  }

  if (["-h", "--help", "bantuan"].includes(args[0])) {
    printHelp();
    return;
  }
  if (["-v", "--version", "versi"].includes(args[0])) {
    console.log(version);
    return;
  }
  if (args[0] === "list" || args[0] === "daftar") {
    printList(args.slice(1).join(" "));
    return;
  }
  if (args[0] === "help") {
    if (!args[1]) {
      printHelp();
      return;
    }
    printCommandHelp(args[1]);
    return;
  }
  if (args[0] === "menu" || args[0] === "ui") {
    if (!stdin.isTTY) {
      printHelp();
      return;
    }
    await runInteractive();
    return;
  }

  const command = commandByName(args[0]);
  if (!command) {
    const suggestion = closest(args[0], commands.map((item) => item.id));
    console.error(bad(`Menu tidak dikenal: ${args[0]}`));
    if (suggestion) console.error(`Mungkin maksudmu: ${accent(suggestion)}`);
    console.error(muted("Jalankan `iky list` untuk melihat 50 menu."));
    process.exitCode = 1;
    return;
  }

  const ctx = {
    stdinText: stdin.isTTY ? "" : await readStdinSafe(),
    out: (text = "") => console.log(text),
  };

  try {
    const input = command.parse ? await command.parse(args.slice(1), ctx) : {};
    await command.run(input, ctx);
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  if (error instanceof UserError) {
    console.error(bad(error.message));
    if (error.usage) console.error(muted(`Pakai: ${error.usage}`));
    process.exitCode = 1;
    return;
  }
  console.error(bad(error?.message ?? String(error)));
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
}

function printBanner() {
  console.log(accent(logo));
  console.log(`${bold("iky")} ${muted(`v${version}`)}  ${dim("50 alat kecil untuk kerja terminal.")}`);
  console.log(muted("Ketik nama menu, pilih kategori, atau `keluar` untuk berhenti."));
}

function printHelp() {
  console.log(accent(logo));
  console.log("");
  console.log(`${bold("iky")} ${muted(`v${version}`)} ${dim("·")} ${commands.length} menu`);
  console.log(dim("Satu terminal, lima puluh alat."));
  console.log("");
  console.log(heading("Pemakaian"));
  console.log("  iky                              buka menu interaktif");
  console.log("  iky <menu> [argumen]             jalankan menu langsung");
  console.log("  iky list [kata]                  cari menu");
  console.log("  iky help <menu>                  detail satu menu");
  console.log("  iky --version                    versi paket");
  console.log("");
  console.log(heading("Contoh"));
  console.log('  iky base64 encode "halo dunia"');
  console.log('  iky calc "2 ^ 10"');
  console.log('  iky json pretty --file package.json');
  console.log("  iky tree . 2");
  console.log("  iky port 3000");
  console.log("  iky contrast \"#1b2430\" \"#e8edf2\"");
  console.log("");
  console.log(heading("Kategori"));
  for (const category of categories) {
    const list = commandsByCategory(category);
    console.log(`  ${bold(category.padEnd(14))} ${muted(`${list.length} menu`)}  ${truncate(list.map((item) => item.id).join(", "), 62)}`);
  }
  console.log("");
  console.log(heading("Lingkungan"));
  console.log("  NO_COLOR=1                       matikan warna ANSI");
  console.log("  DEBUG=1                          tampilkan stack trace saat error");
  console.log("");
  console.log(muted("Beberapa menu memakai jaringan: http, dns, dan port ke host luar."));
  console.log(muted("Jalankan tanpa argumen di terminal untuk mode interaktif."));
}

function printList(term) {
  const matches = searchCommands(term);
  if (!matches.length) {
    console.log(note(`Tidak ada menu yang cocok dengan "${term}".`));
    console.log(muted("Coba kata lain seperti json, teks, waktu, atau file."));
    return;
  }
  console.log(heading(term ? `Menu untuk "${term}"` : `Semua menu (${matches.length})`));
  console.log(
    table(
      ["No", "Menu", "Kategori", "Ringkasan"],
      matches.map((command) => [String(command.number).padStart(2, "0"), command.id, command.category, command.summary]),
      { maxWidth: 54 },
    ),
  );
  console.log("");
  console.log(muted(`Pakai: iky help <menu> · iky <menu> [argumen]`));
}

function printCommandHelp(name) {
  const command = commandByName(name);
  if (!command) {
    console.error(bad(`Menu tidak dikenal: ${name}`));
    const suggestion = closest(name, commands.map((item) => item.id));
    if (suggestion) console.error(`Mungkin maksudmu: ${accent(suggestion)}`);
    process.exitCode = 1;
    return;
  }
  console.log(heading(`${command.id} · ${command.category} · menu ${command.number}`));
  console.log(command.summary);
  console.log("");
  console.log(`${muted("Pakai:")} ${command.usage}`);
  if (command.fields?.length) {
    console.log("");
    console.log(heading("Input interaktif"));
    for (const field of command.fields) {
      const bits = [field.type];
      if (field.default !== undefined) bits.push(`default ${field.default}`);
      if (field.choices) bits.push(field.choices.map((choice) => choice.value).join(" | "));
      console.log(
        `  ${field.key.padEnd(14)} ${field.label}${field.required ? "" : muted(" (opsional)")}${muted(` · ${bits.join(" · ")}`)}`,
      );
    }
  }
  console.log("");
  console.log(muted("Jalankan `iky` tanpa argumen untuk mengisi input lewat menu."));
}

async function runInteractive() {
  const prompt = createPrompt();
  printBanner();
  console.log("");
  try {
    await mainMenu(prompt);
  } finally {
    prompt.close();
  }
}

async function mainMenu(prompt) {
  while (true) {
    console.log("");
    console.log(heading("Menu utama"));
    categories.forEach((category, index) => {
      console.log(
        `  ${muted(String(index + 1).padStart(2))}. ${category.padEnd(16)} ${muted(`${commandsByCategory(category).length} menu`)}`,
      );
    });
    console.log(muted("  Ketik nomor kategori, nama menu, nomor menu dengan awalan #, cari <kata>, semua, atau keluar."));
    const answer = await prompt.ask("Pilih");
    if (!answer) continue;
    const lower = answer.toLowerCase();
    if (["keluar", "exit", "quit", "q"].includes(lower)) return;
    if (["semua", "all", "#"].includes(lower)) {
      const result = await browse(commands, `Semua menu (${commands.length})`, prompt);
      if (result === "quit") return;
      continue;
    }
    if (lower.startsWith("cari ") || lower.startsWith("search ")) {
      const term = answer.split(/\s+/).slice(1).join(" ");
      const matches = searchCommands(term);
      if (!matches.length) {
        console.log(note(`Tidak ada menu yang cocok dengan "${term}".`));
        continue;
      }
      const result = await browse(matches, `Hasil untuk "${term}"`, prompt);
      if (result === "quit") return;
      continue;
    }
    const categoryIndex = Number(answer);
    if (Number.isInteger(categoryIndex) && categoryIndex >= 1 && categoryIndex <= categories.length) {
      const category = categories[categoryIndex - 1];
      const result = await browse(commandsByCategory(category), category, prompt);
      if (result === "quit") return;
      continue;
    }
    const numberMatch = answer.match(/^#?(\d+)$/);
    if (numberMatch) {
      const command = commands.find((item) => item.number === Number(numberMatch[1]));
      if (command) {
        await runInteractiveCommand(command, prompt);
        continue;
      }
    }
    const command = commandByName(answer);
    if (command) {
      await runInteractiveCommand(command, prompt);
      continue;
    }
    const suggestion = closest(answer, commands.map((item) => item.id));
    console.log(note(`Menu tidak dikenal: ${answer}${suggestion ? `. Mungkin maksudmu ${suggestion}?` : "."}`));
  }
}

async function browse(list, title, prompt) {
  console.log("");
  console.log(heading(title));
  console.log(
    table(
      ["No", "Menu", "Ringkasan"],
      list.map((command) => [String(command.number).padStart(2, "0"), command.id, command.summary]),
      { maxWidth: 58 },
    ),
  );
  while (true) {
    const answer = await prompt.ask("Nomor menu, nama, atau kembali");
    if (!answer) continue;
    const lower = answer.toLowerCase();
    if (["kembali", "back", "b"].includes(lower)) return "back";
    if (["keluar", "exit", "quit", "q"].includes(lower)) return "quit";
    const number = Number(answer.replace(/^#/, ""));
    let command = Number.isInteger(number) ? list.find((item) => item.number === number) : null;
    if (!command) command = list.find((item) => item.id === lower);
    if (!command) {
      const suggestion = closest(lower, list.map((item) => item.id));
      console.log(note(`Tidak ada di daftar ini: ${answer}${suggestion ? `. Mungkin ${suggestion}?` : "."}`));
      continue;
    }
    await runInteractiveCommand(command, prompt);
  }
}

async function runInteractiveCommand(command, prompt) {
  console.log("");
  console.log(`${accent("▍")} ${bold(command.id)} ${muted(`· ${command.category}`)}`);
  console.log(muted(command.summary));
  console.log("");
  const ctx = { stdinText: "", out: (text = "") => console.log(text) };
  try {
    const input = await collectFields(command, prompt);
    await command.run(input, ctx);
  } catch (error) {
    handleError(error);
    process.exitCode = 0;
  }
  await prompt.pause();
}

async function readStdinSafe() {
  if (stdin.isTTY) return "";
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    let idleTimer;
    let firstTimer;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(idleTimer);
      clearTimeout(firstTimer);
      stdin.removeListener("data", onData);
      stdin.removeListener("end", onEnd);
      stdin.removeListener("error", onError);
      stdin.pause();
      resolve(value);
    };
    const collect = () => Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
    const onData = (chunk) => {
      size += chunk.length;
      if (size > 20 * 1024 * 1024) {
        process.stderr.write(bad("Input dari stdin melebihi 20 MB.") + "\n");
        process.exitCode = 1;
        finish("");
        return;
      }
      chunks.push(chunk);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => finish(collect()), 250);
    };
    const onEnd = () => finish(collect());
    const onError = () => finish("");
    stdin.on("data", onData);
    stdin.on("end", onEnd);
    stdin.on("error", onError);
    stdin.resume();
    firstTimer = setTimeout(() => {
      if (!chunks.length) finish("");
    }, 80);
  });
}
