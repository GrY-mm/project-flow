# Project Flow

Project Flow es una herramienta del ecosistema FlowKit para crear proyectos web desde plantillas y guardar tus propios diseños para reutilizarlos.

## Requisitos

- Node.js 18 o superior

## Instalar para desarrollo

Desde esta carpeta ejecuta:

```sh
npm link
```

Esto registra los comandos `project-flow` y `flowkit` (alias compatible) en tu terminal. Tambien puedes usarlo durante el desarrollo con `node bin/project-flow.js`.

## Uso

Ejecuta `project-flow` sin argumentos para abrir el menú interactivo. Navega con las flechas y confirma con Enter. Al elegir una plantilla, se crea inmediatamente una carpeta `mi-<plantilla>` (por ejemplo, `mi-html`) dentro de la carpeta actual de la terminal y se muestra su ruta completa. Si esa carpeta ya existe, Project Flow avisa y no sobrescribe su contenido. Desde el menú también puedes ver las plantillas disponibles y guardar una carpeta actual o elegida como plantilla. No hace falta memorizar comandos.

Si prefieres la terminal clásica, también puedes usar los comandos:

```sh
project-flow create mi-sitio
project-flow create mi-portfolio --template portfolio
project-flow create mi-dashboard --template dashboard
project-flow template list
```

Si no se indica plantilla, se utiliza `html`. Cada proyecto se crea en una carpeta con el nombre indicado; Project Flow no sobrescribe destinos existentes. Las plantillas incluidas son `html`, `portfolio` y `dashboard`.

## Guardar una plantilla propia

Guarda la carpeta actual:

```sh
project-flow template save mi-portfolio
```

O guarda una carpeta concreta:

```sh
project-flow template save mi-portfolio --from ./mi-diseno
```

Las plantillas quedan en `~/.flowkit/templates` y aparecen junto con las incluidas en `project-flow template list`. Para actualizar una plantilla guardada, añade `--force`. Al crear un proyecto, Project Flow reemplaza `{{projectName}}` en archivos de texto HTML, CSS, JS, JSON, Markdown, SVG y algunos formatos habituales. Se omiten `.git` y `node_modules` al copiar.

La carpeta local separada para plantillas propias deja la base lista para incorporar mas adelante funciones de exportacion e intercambio con la comunidad de FlowKit.

## Desarrollo

```sh
npm test
```
