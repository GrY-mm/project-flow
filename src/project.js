import path from "node:path";
import { mkdir, readdir, readFile, stat, writeFile, cp, access, rm } from "node:fs/promises";

const validName = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const textExtensions = new Set([
  ".css", ".html", ".js", ".json", ".md", ".mjs", ".txt", ".ts", ".svg", ".xml",
]);

function assertValidName(name, label) {
  if (!validName.test(name) || name === "." || name === "..") {
    throw new Error(`${label} invalido. Usa letras, numeros, puntos, guiones o guiones bajos.`);
  }
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function getTemplate(name, templateRoot, customTemplateRoot) {
  assertValidName(name, "Nombre de plantilla");
  const customPath = path.join(customTemplateRoot, name);
  const bundledPath = path.join(templateRoot, name);

  if (await exists(customPath)) return customPath;
  if (await exists(bundledPath)) return bundledPath;
  throw new Error(`No existe la plantilla "${name}". Ejecuta "flowkit template list" para ver las disponibles.`);
}

async function replaceProjectName(directory, name) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const itemPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await replaceProjectName(itemPath, name);
    } else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      const content = await readFile(itemPath, "utf8");
      await writeFile(itemPath, content.replaceAll("{{projectName}}", name));
    }
  }
}

export async function createProject({ name, templateName, cwd, templateRoot, customTemplateRoot }) {
  assertValidName(name, "Nombre de proyecto");
  const destination = path.resolve(cwd, name);
  const templatePath = await getTemplate(templateName, templateRoot, customTemplateRoot);

  if (await exists(destination)) {
    throw new Error(`El destino ya existe: ${destination}`);
  }
  const templateInfo = await stat(templatePath);
  if (!templateInfo.isDirectory()) {
    throw new Error(`La plantilla "${templateName}" no es un directorio valido.`);
  }

  await mkdir(destination, { recursive: false });
  try {
    await cp(templatePath, destination, {
      recursive: true,
      filter: (source) => !source.split(path.sep).some((part) => part === ".git" || part === "node_modules"),
    });
    await replaceProjectName(destination, name);
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
  return destination;
}

export async function listTemplates({ templateRoot, customTemplateRoot }) {
  const templates = new Map();
  for (const [root, custom] of [[customTemplateRoot, true], [templateRoot, false]]) {
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !templates.has(entry.name)) {
        templates.set(entry.name, { name: entry.name, custom });
      }
    }
  }
  return [...templates.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveTemplate({ name, source, customTemplateRoot, force }) {
  assertValidName(name, "Nombre de plantilla");
  const sourcePath = path.resolve(source);
  const destination = path.join(customTemplateRoot, name);
  const sourceInfo = await stat(sourcePath);

  if (!sourceInfo.isDirectory()) {
    throw new Error(`El origen no es un directorio: ${sourcePath}`);
  }
  if (sourcePath === path.resolve(customTemplateRoot) || sourcePath.startsWith(`${path.resolve(customTemplateRoot)}${path.sep}`)) {
    throw new Error("No se puede guardar una plantilla desde el directorio de plantillas.");
  }
  if (sourcePath === destination || destination.startsWith(`${sourcePath}${path.sep}`)) {
    throw new Error("El destino de la plantilla no puede estar dentro del directorio de origen.");
  }

  await mkdir(customTemplateRoot, { recursive: true });
  if (await exists(destination)) {
    if (!force) {
      throw new Error(`La plantilla "${name}" ya existe. Usa --force para reemplazarla.`);
    }
    await rm(destination, { recursive: true, force: true });
  }
  await cp(sourcePath, destination, {
    recursive: true,
    filter: (item) => !item.split(path.sep).some((part) => part === ".git" || part === "node_modules"),
  });
  return destination;
}
