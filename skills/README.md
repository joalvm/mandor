# Skills

Fuente única, versionada. `.claude/skills` y `.agents/skills` son enlaces (junctions) a este
directorio, ignorados por git, que se crean por checkout o worktree con:

```bash
npm run skills:link
```

Se edita aquí. Un enlace edita este mismo archivo; una copia real se desincroniza.

Las skills son **estándares agnósticos**: no nombran archivos, planes ni documentos del repo.
Lo propio del proyecto (comandos, paquetes, reglas de lint) vive en
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

| Skill              | Cargar cuando                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `code-style`       | Escribir, revisar o refactorizar cualquier código                                           |
| `architecture`     | Crear o mover un archivo, paquete o capa; tocar main, IPC o disco                           |
| `react-components` | Escribir, revisar o descomponer un componente; hook, store o selector; composición en árbol |
| `ui-design`        | Diseñar, maquetar o revisar algo visible: estilo, layout, componentes, marcado, tokens      |
| `testing`          | Escribir, revisar o depurar un test                                                         |
| `plan-writing`     | Convertir una idea aceptada en un plan                                                      |
| `plan-execution`   | Implementar una fase de un plan                                                             |
| `iconography`      | Añadir, dibujar, adaptar o revisar un glifo outlined                                        |
| `git-workflow`     | Crear rama, commit o PR; fusionar y limpiar                                                 |

Una skill por pregunta. Cada regla vive en una sola: si dos se tocan, una apunta a la otra.
