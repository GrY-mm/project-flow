import path from "node:path";
import { createInterface, emitKeypressEvents } from "node:readline";
import { listTemplates, createProject, saveTemplate } from "./project.js";

const reset = "\u001b[0m";
const cyan = "\u001b[36m";
const muted = "\u001b[90m";
const selected = "\u001b[7m";

export function moveSelection(index, key, length) {
  if (length === 0) return 0;
  if (key === "up" || key === "k") return (index - 1 + length) % length;
  if (key === "down" || key === "j") return (index + 1) % length;
  return index;
}

export function orderTemplates(templates) {
  const preferredOrder = ["html", "portfolio", "dashboard"];
  return [...templates].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.name);
    const bIndex = preferredOrder.indexOf(b.name);
    const aRank = aIndex === -1 ? preferredOrder.length : aIndex;
    const bRank = bIndex === -1 ? preferredOrder.length : bIndex;
    return aRank - bRank || a.name.localeCompare(b.name);
  });
}

function render(output, title, description, choices, index) {
  output.write("\u001b[2J\u001b[H");
  output.write(`${cyan}  PROJECT FLOW${reset} ${muted}· herramienta del ecosistema FlowKit${reset}\n\n`);
  output.write(`  ${title}\n`);
  output.write(`  ${muted}${description}${reset}\n\n`);
  choices.forEach((choice, choiceIndex) => {
    const line = `  ${choiceIndex === index ? "›" : " "} ${choice}`;
    output.write(choiceIndex === index ? `${selected}${line}${reset}\n` : `${line}\n`);
  });
  output.write(`\n  ${muted}↑/↓ mover · Enter elegir · Esc volver${reset}\n`);
}

async function choose({ input, output, title, description, choices }) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("La interfaz interactiva necesita una terminal. Ejecuta Project Flow desde una consola.");
  }
  if (choices.length === 0) return -1;

  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  let index = 0;
  render(output, title, description, choices, index);

  try {
    return await new Promise((resolve, reject) => {
      const onKeypress = (_character, key = {}) => {
        if (key.ctrl && key.name === "c") {
          input.off("keypress", onKeypress);
          reject(new Error("Interrumpido."));
          return;
        }
        if (key.name === "escape") {
          input.off("keypress", onKeypress);
          resolve(-1);
          return;
        }
        if (key.name === "return" || key.name === "enter") {
          input.off("keypress", onKeypress);
          resolve(index);
          return;
        }
        const next = moveSelection(index, key.name, choices.length);
        if (next !== index) {
          index = next;
          render(output, title, description, choices, index);
        }
      };
      input.on("keypress", onKeypress);
    });
  } finally {
    input.setRawMode(false);
  }
}

async function ask(input, output, question, defaultValue = "") {
  const prompt = createInterface({ input, output });
  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = await prompt.question(`\n  ${question}${suffix}: `);
    return answer.trim() || defaultValue;
  } finally {
    prompt.close();
  }
}

async function waitForEnter(input, output) {
  const prompt = createInterface({ input, output });
  try {
    await prompt.question("\n  Pulsa Enter para continuar...");
  } finally {
    prompt.close();
  }
}

function clear(output) {
  output.write("\u001b[2J\u001b[H");
}

async function createFlow({ input, output, cwd, templateRoot, customTemplateRoot }) {
  const templates = orderTemplates(await listTemplates({ templateRoot, customTemplateRoot }));
  if (templates.length === 0) throw new Error("No hay plantillas disponibles.");
  const templateIndex = await choose({
    input,
    output,
    title: "Elige una plantilla",
    description: "Usa las flechas y confirma con Enter.",
    choices: templates.map(({ name, custom }) => `${name}${custom ? " · guardada" : ""}`),
  });
  if (templateIndex < 0) return;

  const templateName = templates[templateIndex].name;
  const name = `mi-${templateName}`;
  output.write(`\n  Creando "${name}" con la plantilla "${templateName}" en la carpeta actual...\n`);
  const destination = await createProject({
    name,
    templateName,
    cwd,
    templateRoot,
    customTemplateRoot,
  });
  output.write(`\n  ¡Proyecto creado correctamente!\n  Carpeta: ${destination}\n  Puedes abrir esa carpeta en tu editor para empezar.\n`);
}

async function saveFlow({ input, output, cwd, customTemplateRoot, chooseSource }) {
  const name = await ask(input, output, "Nombre para guardar la plantilla");
  if (!name) return;
  const source = chooseSource
    ? await ask(input, output, "Ruta de la carpeta que quieres guardar", cwd)
    : cwd;
  const destination = path.resolve(cwd, source);
  const existing = await listTemplates({
    templateRoot: path.join(cwd, "__flowkit_no_bundled_templates__"),
    customTemplateRoot,
  });
  const alreadyExists = existing.some((template) => template.name === name);
  let force = false;
  if (alreadyExists) {
    const answer = await choose({
      input,
      output,
      title: "La plantilla ya existe",
      description: `¿Quieres reemplazar "${name}"?`,
      choices: ["No, volver", "Sí, reemplazar"],
    });
    if (answer !== 1) return;
    force = true;
  }
  const savedAt = await saveTemplate({ name, source: destination, customTemplateRoot, force });
  output.write(`\n  Plantilla guardada en ${savedAt}\n`);
}

async function templatesFlow({ input, output, templateRoot, customTemplateRoot }) {
  const templates = await listTemplates({ templateRoot, customTemplateRoot });
  const index = await choose({
    input,
    output,
    title: "Tus plantillas",
    description: "Las plantillas guardadas están disponibles al crear proyectos.",
    choices: [...templates.map(({ name, custom }) => `${name}${custom ? " · guardada" : " · incluida"}`), "Volver"],
  });
  if (index >= 0 && index < templates.length) {
    clear(output);
    output.write(`  ${templates[index].name}\n`);
    output.write(`  ${templates[index].custom ? "Plantilla guardada por ti." : "Plantilla incluida en Project Flow."}\n`);
    await waitForEnter(input, output);
  }
}

export async function runInteractive(options = {}) {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("La interfaz interactiva necesita una terminal. Ejecuta Project Flow desde una consola.");
  }
  const cwd = options.cwd ?? process.cwd();
  const templateRoot = options.templateRoot;
  const customTemplateRoot = options.customTemplateRoot;
  const menu = ["Crear proyecto", "Ver plantillas", "Guardar la carpeta actual como plantilla", "Guardar otra carpeta como plantilla", "Salir"];

  while (true) {
    let choice;
    try {
      choice = await choose({
        input,
        output,
        title: "¿Qué quieres hacer?",
        description: "Crea proyectos y administra tus plantillas sin memorizar comandos.",
        choices: menu,
      });
      if (choice < 0 || choice === 4) {
        clear(output);
        output.write("  ¡Hasta pronto!\n");
        return;
      }

      const flowOptions = { input, output, cwd, templateRoot, customTemplateRoot };
      if (choice === 0) await createFlow(flowOptions);
      if (choice === 1) await templatesFlow(flowOptions);
      if (choice === 2) await saveFlow({ ...flowOptions, chooseSource: false });
      if (choice === 3) await saveFlow({ ...flowOptions, chooseSource: true });
    } catch (error) {
      if (error.message === "Interrumpido.") {
        clear(output);
        output.write("  Interrumpido.\n");
        return;
      }
      output.write(`\n  ${error.message}\n`);
    }
    await waitForEnter(input, output);
  }
}
