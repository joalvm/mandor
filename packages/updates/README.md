# `@mandor/updates`

Lo que la ventana dice de las actualizaciones. Main busca, descarga y cuenta; este paquete solo
pinta lo que main le dice y le pide lo que la persona decide. Lo montan las dos apps con
`<UpdatesStatus />` en su árbol.

- **Barra de estado**: progreso de la descarga, «Descargar» u «Obtener» con una versión nueva, y
  «Reiniciar para actualizar» con una lista. Sin nada que decir, no pinta.
- **Toast**: una vez por versión lista, con la acción de reiniciar.

Lo demás (buscar, reiniciar, notas de la versión) vive en el menú Ayuda de la aplicación, que
arma main.

El estado vive en `update-store` y se alimenta de `bridge.update.state` y `onChanged`: main es el
dueño, la ventana no calcula nada.
