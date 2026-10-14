# FlowKit

FlowKit es una herramienta de terminal para crear proyectos web desde plantillas y guardar tus propios diseños para reutilizarlos.

## Requisitos

- Node.js 18 o superior

## Instalar para desarrollo

Desde esta carpeta ejecuta:

```sh
npm link
```

Tambien puedes usar los comandos durante el desarrollo con `node bin/flowkit.js`.

## Uso

```sh
flowkit create mi-sitio
flowkit create mi-portfolio --template portfolio
flowkit create mi-dashboard --template dashboard
flowkit template list
```

Si no se indica plantilla, se utiliza `html`. Cada proyecto se crea en una carpeta con el nombre indicado; FlowKit no sobrescribe destinos existentes. Las plantillas incluidas son `html`, `portfolio` y `dashboard`.

## Guardar una plantilla propia

Guarda la carpeta actual:

```sh
flowkit template save mi-portfolio
```

O guarda una carpeta concreta:

```sh
flowkit template save mi-portfolio --from ./mi-diseno
```

Las plantillas quedan en `~/.flowkit/templates` y aparecen junto con las incluidas en `flowkit template list`. Para actualizar una plantilla guardada, añade `--force`. Al crear un proyecto, FlowKit reemplaza `{{projectName}}` en archivos de texto HTML, CSS, JS, JSON, Markdown, SVG y algunos formatos habituales. Se omiten `.git` y `node_modules` al copiar.

La carpeta local separada para plantillas propias deja la base lista para incorporar mas adelante funciones de exportacion e intercambio con la comunidad.

## Desarrollo

```sh
npm test
```
