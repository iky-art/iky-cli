import { systemCommands } from "./commands/system.js";
import { textCommands, htmlCommands } from "./commands/text.js";
import { encodingCommands } from "./commands/encoding.js";
import { timeCommands } from "./commands/time.js";
import { numberCommands } from "./commands/number.js";
import { randomCommands } from "./commands/random.js";
import { developerCommands } from "./commands/developer.js";
import { fileCommands } from "./commands/files.js";

const all = [
  ...systemCommands,
  ...textCommands,
  ...htmlCommands,
  ...encodingCommands,
  ...timeCommands,
  ...numberCommands,
  ...randomCommands,
  ...developerCommands,
  ...fileCommands,
];

if (all.length > 50) {
  throw new Error(`Registry memuat ${all.length} menu, melewati batas 50.`);
}

export const commands = all.map((command, index) => ({ ...command, number: index + 1 }));

export const categories = [...new Set(commands.map((command) => command.category))];

export function commandByName(name) {
  const normalized = String(name).toLowerCase();
  return commands.find((command) => command.id === normalized) ?? null;
}

export function commandsByCategory(category) {
  return commands.filter((command) => command.category === category);
}

export function searchCommands(term) {
  const query = String(term).toLowerCase().trim();
  if (!query) return commands;
  return commands.filter((command) =>
    [command.id, command.summary, command.category, command.usage].some((field) =>
      field.toLowerCase().includes(query),
    ),
  );
}
