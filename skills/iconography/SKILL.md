---
name: iconography
description: Estándar para construir y revisar glifos outlined de 16×16, con variantes ópticas de 14 y 18 px y grosor visual constante. Usar al añadir, dibujar o adaptar un icono; cubre metáfora, áreas de trabajo, contornos, familias y exportación del dibujo.
---

# Iconography

Construir una familia outlined: interior abierto, poco detalle, terminales redondeados y
un único peso. Lienzo base 16×16; variantes ópticas 14 y 18. El objetivo es que los iconos
se entiendan juntos a tamaño real, no que cada dibujo resulte vistoso al ampliarlo.

## Pensar antes de añadir

1. Identificar intención, contexto y texto que acompaña al icono. Buscar una metáfora existente
   antes de crear otra. Un nombre parecido en una biblioteca no demuestra el mismo significado.
2. Comparar silueta, ocupación y detalle con su familia. Preferir formas familiares; si requiere
   explicación para entenderse, simplificar o acompañar con texto.
3. Dibujar o adaptar solo cuando falte significado, apariencia outlined o variante óptica.
   Conservar procedencia y modificaciones cuando el dibujo derive de otra fuente.
4. Separar pictogramas de marcas. No improvisar una versión hueca de un logotipo sólido;
   proponer símbolo genérico con nombre visible o resolver la excepción antes de dibujar.

Nombrar intención con vocabulario estable, sin proveedor ni tamaño en el nombre del icono.
Fuentes en kebab-case. Variantes comparten nombre base y calificadores previsibles.
No introducir sinónimos que dupliquen el registro.

## Lienzo, plantilla y áreas de trabajo

Una unidad de diseño equivale a un píxel CSS cuando el master se muestra a su tamaño nativo.
No confundir esa unidad con un píxel físico de pantalla ni con la resolución de una guía PNG.

| Área       | Coordenadas del master 16    | Uso                                                    |
| ---------- | ---------------------------- | ------------------------------------------------------ |
| Lienzo     | x/y 0–16                     | Mesa y exportación cuadradas; centro geométrico (8, 8) |
| Área viva  | x/y 1–15                     | Margen exterior nominal de 1                           |
| Cuadrado   | x/y 2–14                     | Referencia 12×12 para siluetas cuadradas               |
| Círculo    | Centro (8, 8), radio 7       | Diámetro 14; compensa menor masa en las esquinas       |
| Vertical   | x 3–13, y 1–15               | Referencia 10×14 para formas altas                     |
| Horizontal | x 1–15, y 3–13               | Referencia 14×10 para formas anchas                    |
| Ejes       | x = 8, y = 8                 | Alineación inicial                                     |
| Diagonales | Esquinas opuestas del lienzo | Referencia de 45°                                      |

Elegir la keyline de la silueta; no intentar tocar todas. Las cajas miden **borde exterior
visible**, no eje de trazo. Un círculo necesita más extensión que un cuadrado para parecer
igual de grande. Ajustar centro óptico cuando la asimetría lo requiera y registrar el motivo.
No recentrar automáticamente un dibujo que ya está compensado o alineado a píxel.

Estas medidas definen este perfil de construcción; no son una norma atribuida a una biblioteca
externa. Conservar una fuente existente que ya sea coherente aunque su ocupación difiera;
documentar la excepción concreta. No deformar proporciones para llenar la keyline.

Al usar una plantilla PNG ampliada, colocarla en una mesa 16×16 con posición (0, 0) y tamaño
16×16. Bloquearla encima o debajo del dibujo; trabajar en otra capa. Configurar la rejilla del
editor a 1 unidad, con subdivisión 0.5 si ayuda: la imagen no aporta snapping vectorial.
Ocultar la guía antes de exportar.

## Grosor, terminales y radios

**Nominal: 1 px CSS a zoom 100% en 14, 16 y 18.** Un peso para toda la familia. Curvas y
diagonales admiten compensación óptica; no imponer idéntica distancia a cada punto de una curva.

| Rasgo            | Regla de construcción en la mesa nativa                              |
| ---------------- | -------------------------------------------------------------------- |
| Asta ortogonal   | Grosor 1; eje en media unidad y bordes enteros cuando sea posible    |
| Terminal redondo | Radio 0.5                                                            |
| Marco grande     | Radio inicial de eje 2; exterior 2.5 e interior 1.5                  |
| Pieza pequeña    | Radio inicial de eje 1; exterior 1.5 e interior 0.5                  |
| Espacio negativo | Preferir al menos 2 unidades; mínimo excepcional 1, revisado a 14 px |

Radios son puntos de partida, no una obligación idéntica para carpetas, llaves y chevrones.
Para grosor `t` y radio del eje `r`: exterior `r+t/2`, interior `r-t/2`. El interior nunca es
negativo. Si está fijado el borde exterior, calcular el eje desde ese borde.

Medir grosor perpendicular al tramo; la caja de una diagonal no lo mide. Mantener continuidad
de curvas con pocos nodos. Despejar cruces para evitar manchas o estrangulamientos.
Comparar masa junto a signos simples, una lupa, una carpeta, un chevron y texto de 13 px.
Si un dibujo domina, simplificar detalle o ajustar ocupación antes de alterar el grosor.
Curvas, DPR y zoom fraccional producen antialias; no prometer nitidez perfecta en toda escala.

## Contornos, huecos y composición

Outlined describe apariencia, no atributo SVG. Un contorno expandido puede usar
`fill="currentColor"` y conservar un centro transparente. Pintar el centro del color del
fondo no crea un hueco. Puntos de elipsis y puntuación pueden ser sólidos; cuerpos grandes, no.

Dibujar con trazos editables; expandirlos solo en la copia de exportación. Unir superposiciones
y sustraer huecos. Varios paths son válidos. Conservar `fill-rule` y dirección de subpaths:
`evenodd` y `nonzero` no son intercambiables sin revisar el resultado. No aplicar `fill="none"`
ni añadir stroke a contornos ya expandidos.

Una metáfora base y como máximo un modificador. Para un badge nuevo, punto inicial en master 16:
caja x/y 10–15, separación visible preferida de 1.5 respecto a la base. Puede exigir reducir
o abrir parte del dibujo; si deja de leerse a 14, cambiar metáfora o usar texto.

Familias conservan base, ocupación y posición del modificador. Comparar activado/desactivado,
conectado/desconectado y sus variantes juntos. Un slash abre el cruce con geometría transparente,
nunca con pintura del fondo. Flecha indica dirección; chevron, despliegue; triángulo, reproducción.

## Adaptar a 14 y 18 sin cambiar peso

Escalar un contorno expandido de 1 unidad desde 16 produce grosores 0.875 en 14 y 1.125 en 18.
Por eso cada tamaño necesita su variante óptica: mesas nativas 14×14, 16×16 y 18×18, todas con
grosor nominal 1. Ajustar tamaño de formas, huecos, detalle y alineación manteniendo familia.

Para mesa de lado `S`, reconstruir guías: margen 1; círculo de diámetro `S−2`; cuadrado `S−4`;
rectángulo alto `(S−6)×(S−2)` y ancho inverso; centro `S/2`. No escalar la guía de 16 como
sustituto: cambiaría sus márgenes. En 14, área viva 1–13; en 18, 1–17.

Si existen ejes editables, ajustar posiciones conservando grosor. Si solo hay rellenos
expandidos, adaptar contornos y huecos. Un offset automático produce un candidato, no un dibujo
aprobado. No simular grosor con opacidad, sombras, filtros o stroke sobre rellenos.
`vector-effect="non-scaling-stroke"` no afecta áreas rellenas.

Conservar masters con su viewBox nativo. Si la entrega técnica requiere viewBox común 16,
transformar toda la geometría por `16/S` y mostrarla a `S`; el grosor final vuelve a 1.
Cambiar solo el atributo viewBox no transforma geometría. Coordenadas normalizadas fraccionarias
son correctas; la revisión se hace al tamaño de destino. No sustituir una variante ausente
por otra escalada sin demostrar que cumple el grosor.

## Exportar y revisar el dibujo

Guardar fuente editable. Exportar copia con contornos expandidos y huecos reales, sin guías,
fondo, texto, raster, filtros, scripts ni recursos externos. Color monocromo `currentColor`;
no colores fijos ni máscaras del color del fondo. Mesa cuadrada y viewBox coherentes.
No limitar el SVG a un path, comandos M/L/C/Z o un winding único por comodidad del validador.

Inspección obligatoria a tamaño real; ampliar solo para diagnosticar:

- Cada icono en 14/16/18, sobre claro, oscuro y un color ajeno al dibujo para revelar falsos huecos.
- Metáfora entendible; contorno abierto, espacios negativos legibles, sin recortes ni manchas.
- Grosor percibido equivalente entre tamaños; masa, altura y centro coherentes con su familia.
- Variantes juntas y junto a texto/controles reales. Revisar alineación y significado en contexto.
- Muestras críticas a escalas 125%, 150% y 200%; DPR 1 y 2 cuando el entorno lo permita.

Registrar excepción por dibujo, tamaño, motivo y evidencia. Iconos propios y adaptados cumplen
el mismo estándar visual; el origen no autoriza omitir revisión. Un test geométrico no decide
si la metáfora se entiende ni si el peso parece uniforme.
