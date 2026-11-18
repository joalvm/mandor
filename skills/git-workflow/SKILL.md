---
name: git-workflow
description: Convención de ramas, commits y pull requests — título Conventional Commits en español, cuerpo con qué y por qué, gate de QA contra la base real, squash y limpieza tras fusionar. Usar antes de crear una rama, redactar un commit o abrir, fusionar o cerrar un PR.
---

# Git workflow

Objetivo: un historial que se entiende sin abrir el diff. Qué conserva el squash (cuerpo del PR
o mensajes de los commits) lo fija el repo: lo que conserva se escribe para el historial.

## Rama

- Nombre `tipo/descripcion-corta`: tipo de la tabla de abajo, descripción en kebab-case
  (`[a-z0-9]` y guiones simples).
- Nace de `main` recién traída (`git fetch` antes).
- Una rama = un cambio = un PR. Un plan entero = una rama.
- Checkout principal ocupado o agentes en paralelo → un worktree y una rama por agente.

## Título

Mismo formato en commit y PR: `tipo(alcance): descripción`.

| Tipo       | Cuándo                                                      |
| ---------- | ----------------------------------------------------------- |
| `feat`     | Capacidad nueva para el usuario o para la API de un paquete |
| `fix`      | Comportamiento incorrecto que pasa a ser correcto           |
| `refactor` | Misma conducta observable, otra forma                       |
| `test`     | Solo pruebas                                                |
| `docs`     | Solo documentación                                          |
| `build`    | Herramientas, dependencias, CI, empaquetado                 |
| `chore`    | Mantenimiento que no encaja en los anteriores               |

- `alcance` opcional: el paquete o la app tocada, en minúsculas (`[a-z0-9@/-]`), escrito siempre
  igual. Se omite si el cambio cruza medio repo. Sin `!`.
- **Título entero ≤120 caracteres**, tipo y alcance incluidos.
- Descripción en español y en presente. Dice el efecto (qué hace el sistema ahora) y cubre el eje
  del cambio, no cada archivo.

## Cuerpo

- En español. Qué cambió y por qué, sin repetir el título.
- Un cambio ligado: un párrafo corto. Varios frentes: lista, un cambio y su motivo por línea.
- Habla solo del cambio entregado: sin agentes, planes, fases ni hitos, sin trailer
  `Co-Authored-By`, sin lo que vendrá.

## Antes de cada commit

- [ ] El diff staged es de esta tarea y de nada más.
- [ ] Cero secretos, cero rutas absolutas de la máquina, cero archivos de estado local. El gate
      de QA no busca secretos ni mira la documentación: esto se revisa a ojo en el diff.

## Pull request

- Antes de abrirlo, **una** pasada del gate de QA con el título del PR pasado explícitamente (si
  no, valida el del último commit) y la base real (`origin/main`). QA mira el rango completo del
  PR, no cada commit: correrlo por commit gasta sin comprobar más.
- Base escrita explícitamente con `--base`.
- Cuerpo: qué entra, qué queda fuera, cómo se verificó (comando y resultado) y los SHA de head y
  base validados.
- Se fusiona solo con squash y con los gates en verde sobre esos mismos SHA. Si head o base
  cambian, se vuelve a validar.
- Tras fusionar: borrar la rama local y la remota, `git fetch --prune`, quitar el worktree y
  actualizar el checkout principal con `--ff-only`. Toda rama marcada `[gone]` se borra.

## Guardarraíles

| Nunca                                  | En su lugar                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| `push --force` sobre rama compartida   | Commit nuevo encima                                         |
| `--no-verify`, saltar hooks o firma    | Arreglar lo que el hook señala                              |
| Fusionar con gates rojos o sin correr  | Correrlos sobre los SHA exactos del PR                      |
| `git stash` / `stash pop` sin etiqueta | Commit WIP; o `stash push -u -m <tag>`, `apply <sha>`, drop |
| Ramas «por si acaso»                   | Crear la rama cuando existe el cambio                       |
| Títulos `wip`, `fix`, `ajustes varios` | Título que nombra el efecto                                 |
