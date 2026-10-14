import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createProject,
  listTemplates,
  saveTemplate,
} from "./project.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  return `FlowKit - crea proyectos web desde la terminal

Uso:
  flowkit create <nombre> [--template <plantilla>]
  flowkit template list
  flowkit template save <nombre> [--from <directorio>] [--force]
  flowkit help

Plantillas incluidas: html, portfolio, dashboard
Las plantillas guardadas se almacenan en ~/.flowkit/templates.
`;
}

function parseFlags(args) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force") {
      flags.force = true;
    } else if (arg === "--template" || arg === "--from") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Falta un valor para ${arg}.`);
      }
      flags[arg.slice(2)] = value;
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Opcion desconocida: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

export async function run(args, options = {}) {
  const io = options.io ?? console;
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const home = options.home ?? env.HOME ?? env.USERPROFILE ?? process.cwd();
  const templateRoot = options.templateRoot ?? path.join(packageRoot, "templates");
  const customTemplateRoot = path.join(home, ".flowkit", "templates");

  if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    io.log(usage());
    return;
  }

  const command = args[0];
  if (command === "create") {
    const { positional, flags } = parseFlags(args.slice(1));
    if (positional.length !== 1) {
      throw new Error("Uso: flowkit create <nombre> [--template <plantilla>]");
    }
    const destination = await createProject({
      name: positional[0],
      templateName: flags.template ?? "html",
      cwd,
      templateRoot,
      customTemplateRoot,
    });
    io.log(`Proyecto creado: ${destination}`);
    return;
  }

  if (command === "template") {
    const action = args[1];
    if (action === "list" && args.length === 2) {
      const templates = await listTemplates({ templateRoot, customTemplateRoot });
      io.log("Plantillas disponibles:");
      for (const template of templates) {
        io.log(`  ${template.name}${template.custom ? " (guardada)" : ""}`);
      }
      return;
    }

    if (action === "save") {
      const { positional, flags } = parseFlags(args.slice(2));
      if (positional.length !== 1) {
        throw new Error("Uso: flowkit template save <nombre> [--from <directorio>] [--force]");
      }
      const savedAt = await saveTemplate({
        name: positional[0],
        source: flags.from ? path.resolve(cwd, flags.from) : cwd,
        customTemplateRoot,
        force: flags.force ?? false,
      });
      io.log(`Plantilla guardada: ${savedAt}`);
      return;
    }
  }

  throw new Error(`Comando no reconocido.\n\n${usage()}`);
}
