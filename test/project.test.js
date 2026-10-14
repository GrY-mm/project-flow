import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createProject, listTemplates, saveTemplate } from "../src/project.js";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "flowkit-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bundled = path.join(root, "bundled");
  const custom = path.join(root, ".flowkit", "templates");
  const cwd = path.join(root, "work");
  await mkdir(path.join(bundled, "html"), { recursive: true });
  await mkdir(cwd);
  await writeFile(path.join(bundled, "html", "index.html"), "<title>{{projectName}}</title>");
  return { root, bundled, custom, cwd };
}

test("creates a project and replaces its name in template files", async (t) => {
  const { bundled, custom, cwd } = await fixture(t);
  const destination = await createProject({
    name: "my-site", templateName: "html", cwd, templateRoot: bundled, customTemplateRoot: custom,
  });
  assert.equal(await readFile(path.join(destination, "index.html"), "utf8"), "<title>my-site</title>");
});

test("refuses invalid names and existing destinations", async (t) => {
  const { bundled, custom, cwd } = await fixture(t);
  await assert.rejects(createProject({
    name: "../oops", templateName: "html", cwd, templateRoot: bundled, customTemplateRoot: custom,
  }), /invalido/);
  await mkdir(path.join(cwd, "existing"));
  await assert.rejects(createProject({
    name: "existing", templateName: "html", cwd, templateRoot: bundled, customTemplateRoot: custom,
  }), /ya existe/);
});

test("saves a local template and uses it to create future projects", async (t) => {
  const { root, bundled, custom, cwd } = await fixture(t);
  const source = path.join(root, "my-portfolio");
  await mkdir(source);
  await writeFile(path.join(source, "index.html"), "<h1>{{projectName}} portfolio</h1>");
  await saveTemplate({ name: "portfolio-personal", source, customTemplateRoot: custom, force: false });
  const templates = await listTemplates({ templateRoot: bundled, customTemplateRoot: custom });
  assert.deepEqual(templates.map(({ name, custom: isCustom }) => [name, isCustom]), [
    ["html", false], ["portfolio-personal", true],
  ]);
  const destination = await createProject({
    name: "new-portfolio", templateName: "portfolio-personal", cwd, templateRoot: bundled, customTemplateRoot: custom,
  });
  assert.equal(await readFile(path.join(destination, "index.html"), "utf8"), "<h1>new-portfolio portfolio</h1>");
});

test("requires --force before replacing a saved template", async (t) => {
  const { root, custom } = await fixture(t);
  const source = path.join(root, "source");
  await mkdir(source);
  await writeFile(path.join(source, "index.html"), "first");
  await saveTemplate({ name: "mine", source, customTemplateRoot: custom, force: false });
  await assert.rejects(saveTemplate({ name: "mine", source, customTemplateRoot: custom, force: false }), /ya existe/);
});
