# Planes

Aquí vive solo el hito abierto, en `docs/plans/hito-N/`. Un plan cumplido es andamio: al cerrar el
hito su carpeta se borra y lo construido pasa a [`specs/mandor.md`](../specs/mandor.md). Lo que
falta, sin plan todavía: [`specs/pendiente.md`](../specs/pendiente.md).

| Hito                           | Estado  |
| ------------------------------ | ------- |
| H1 — Rebanada vertical Async   | hecho   |
| H2 — Workbench                 | hecho   |
| H3 — Catálogo, entornos y vars | hecho   |
| H4 — Async completo            | hecho   |
| H5 — Sync (H5 + H6)            | hecho   |
| H7 — Orígenes y conflictos     | hecho   |
| H8 — Robustez                  | hecho   |
| H9 — Colecciones completas     | hecho   |
| H10 — Scripts                  | hecho   |
| H11 — Publicación              | abierto |

- Un solo hito `abierto`. Sus planes se escriben al abrirlo, mirando el código que dejó el
  anterior. `docs/plans/hito-N/README.md` lleva una fila por plan con prerequisitos y estado.
- Plan nuevo: copia de [`TEMPLATE.md`](TEMPLATE.md), nombre `NN-kebab.md`. Un plan = una rama.
- Se toma la primera fase sin marcar. Cada fase lleva su bloque ` ```check `, escrito antes del
  código; lo lee `npm run plans`, dentro de `verify`.
- Cerrar un hito: su fila pasa a `hecho` y su carpeta se borra, en el mismo cambio.
- Skills: `plan-writing` para escribirlo, `plan-execution` para ejecutarlo.
