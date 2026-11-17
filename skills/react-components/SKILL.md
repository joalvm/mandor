---
name: react-components
description: Estándar de componentes React 19 con zustand y Tailwind — composición en árbol como regla dura (nada de componentes, marcado ni funciones que pintan por props) y sus antipatrones, archivo y props, identidad data-part, quién lee el store, hooks sin efectos derivados, handlers, i18n y clases. Usar al escribir, revisar o descomponer un componente, un hook, un store o un selector.
---

# React components

Cómo se escribe el archivo. Qué cajas lleva el marcado y cómo se ve → skill
de diseño.

## Composición en árbol — regla dura

**Ningún componente recibe por props otro componente, un trozo de marcado ni una función que
devuelva marcado.** La pantalla se escribe como HTML: un contenedor y, dentro, sus partes como
hijos. Sin excepciones por comodidad, por «es solo un icono» ni porque una librería lo haga así.
Un cambio que lo incumple no se acepta, aunque todo lo demás esté bien; la lint lo rechaza y la
revisión también.

Por qué:

- El archivo deja de leerse como la pantalla: lo que llena una zona se construye en otro sitio y
  encontrarlo obliga a seguir un nombre por varios archivos.
- Cada hueco nuevo es una prop nueva: el contenedor se vuelve un embudo cuya firma crece con cada
  uso, y todos los usos quedan atados a su forma.
- El tipo deja de decir qué cabe: `ReactNode` acepta cualquier cosa.

| Forma permitida       | Cuándo                                                 |
| --------------------- | ------------------------------------------------------ |
| `children`            | el componente contiene algo y no lo dibuja             |
| lista de descriptores | N huecos homogéneos (pestañas, filas): datos, no nodos |
| registro declarativo  | lo rellena código que este archivo no puede importar   |

### Antipatrones

Cada fila está prohibida. La columna derecha es lo que se escribe en su lugar.

| Antipatrón                 | Se reconoce por                                                 | En su lugar                                                          |
| -------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Marcado por prop           | `icon={<X />}`, `header`, `footer`, `actions`, `empty`, `start` | parte hija con nombre; el glifo fijo lo escribe el propio componente |
| Función que pinta          | `renderItem`, `renderRow`, `children` como función              | parte hija que lee su contexto con un hook                           |
| Componente como valor      | `as={Link}`, `component={Row}`, `ItemComponent`, `slots={{…}}`  | el padre escribe el elemento que quiere                              |
| Configuración que dibuja   | `columns={[{ render }]}`, mapas u objetos con JSX               | descriptores solo con datos; el pintado vive en el árbol             |
| Miembros estáticos         | `Panel.Header`, `Menu.Item`                                     | exports con nombre, un archivo cada uno                              |
| Inyectar por envoltura     | `cloneElement`, `Children.map` que añade props, `withX(C)`      | contexto del contenedor leído con un hook; lógica en un hook         |
| Booleanas de modo          | `compact`, `withHeader`, `bordered` combinadas                  | un eje de variante tipado, o dos componentes                         |
| Componente dios            | una prop `mode` o `kind` que ramifica el render entero          | un componente por caso, elegido con una tabla tipada                 |
| Perforar props             | un dato cruza dos o más niveles que no lo usan                  | la hoja lee su store, o un contexto del subárbol                     |
| Componente dentro de otro  | `function Row()` declarada en el cuerpo de un componente        | a nivel de módulo: dentro se remonta y pierde estado en cada render  |
| Estado espejo              | `useState(prop)`, efecto que copia una prop a estado            | derivar en render                                                    |
| Se coloca a sí mismo       | margen exterior, ancho o posición según dónde lo usan           | el padre pone hueco, tamaño y sitio                                  |
| Esparcir lo desconocido    | `{...rest}` hacia el DOM                                        | cada prop declarada y pasada por nombre                              |
| Clave inestable            | `key={index}` en una lista que cambia, clave aleatoria          | el id del dato                                                       |
| Ramas en cascada en el JSX | ternarios anidados, cadenas de `&&`                             | un componente por rama, elegido por tabla                            |

Ejemplos de cada sustitución y el método para descomponer una pantalla →
[references/composition.md](references/composition.md).

## Archivo

```tsx
type CollectionRowProps = {
    item: CollectionItem;
    selected: boolean;
    onSelect: (id: string) => void;
};

/** Decides how one collection entry reads and reacts; the tree owns order and focus. */
export const CollectionRow = memo(function CollectionRow({
    item,
    selected,
    onSelect,
}: CollectionRowProps) {
    return (
        <div className={ROW} data-part="collection-row" data-selected={selected}>
            …
        </div>
    );
});
```

- Un componente por archivo, export con nombre, sin tipo de retorno anotado.
- Dentro de `components/`, siempre en la subcarpeta de la zona de pantalla que dibuja (`panel/`,
  `sidebar/`, `tab/`, `dialog/`). La raíz de la app vive en su carpeta de app; un paquete sin
  zonas no abre `components/`.
- Props: tipo local `<Componente>Props` justo encima, desestructurado en la firma con defaults
  ahí. Si cumple un contrato ajeno, usa ese tipo sin renombrarlo.
- `children` vía `PropsWithChildren<…>`, nunca declarado a mano (salvo estrecharlo a un solo
  elemento).
- Orden: datos, luego callbacks; alfabético dentro de cada grupo. Booleanos con nombre de
  estado. Cinco props como techo: la sexta dice que son dos componentes o falta un objeto.
- `memo(function Name…)` en componentes de lista. Función con nombre siempre: la anónima sale
  como `Anonymous` en DevTools.

## Identidad

- `data-part` en kebab-case, obligatorio en la **raíz**: el nombre del componente, o el del
  sitio que ocupa. Dentro, solo en los sitios con nombre que estilos o tests agarran (skill de
  diseño).
- Nunca dato del usuario dentro (el DOM acaba en capturas). Distinguir instancias con el id del
  recurso en otro atributo.
- Sin `data-testid`. `id` nunca como identidad: solo para enlazar ARIA o etiqueta, con `useId()`
  (el componente puede montarse dos veces). `displayName` solo donde React no infiere el nombre.

## Composición: detalle

El árbol del archivo es el árbol de la pantalla.

- Ninguna prop salvo `children` lleva `ReactNode`, `ReactElement`, `JSX.Element`, `ElementType`
  ni `ComponentType`, ni un callback que los devuelva, se llame como se llame.
- **Glifos**: lo que el componente dibuja siempre (chevron, check, la «v» del desplegable) va
  escrito dentro. Lo que dibujaría a veces no existe. Sin props `icon?`, `start`, `end`,
  `leading`, `trailing`. Excepción: el glifo **es** el control (`IconButton`), y entonces es
  obligatorio.
- El mismo trío repetido en tres sitios (glifo, nombre, chevron) es un componente que falta.

### Registros declarativos

Un registro se llena **escribiendo componentes en el árbol**, como HTML, no llamando a una
función que recibe otra que pinta.

```tsx
<TabKind id="connection" icon="connection" title={connectionTitle} closable>
    <TabIndicator>
        <TabTransportMark />
    </TabIndicator>
    <TabBody>
        <TabConnectionPanel />
    </TabBody>
</TabKind>
```

- El componente dueño recibe por props solo la **lógica** (id, orden, título, permisos) y la
  declara en un `useLayoutEffect` que devuelve su baja: montado, existe; desmontado, no.
- Cada **parte** visible es un hijo con nombre (`TabBody`, `TabIndicator`, `SidebarSectionBody`)
  que declara su contenido y devuelve `null`. Fuera de su dueño, lanza al renderizar.
- La parte lee su contexto con un hook (`useTab`, `useItem`, `useTabStrip`), nunca por un
  argumento de una función: `const { resource, tabId } = useTab();`.
- Ningún tipo guarda una función que devuelve `ReactNode` o `ReactElement`; la lint lo rechaza.
- Una pieza de una sola parte (estado, grupo vacío, acción de tira) se declara con
  `useDeclaration` y sus `children` son lo que pinta.

## Datos

- **Cada componente lee del store lo que dibuja**, con su selector. Subir la lectura a un padre
  para bajarla por props repinta de más y esconde de quién es el dato.
- Quien lee, escribe: la acción la llama el componente dueño de esa regla.
- Las primitivas de UI no leen ningún store: todo entra por props.
- Context solo para un valor de subárbol que muere con él; lleva datos y callbacks, nunca
  componentes.
- Muchos callbacks para filas memoizadas → un objeto tipado en `useMemo`.
- Vacíos como constantes de módulo, para conservar identidad.

## Hooks

| Necesidad                 | Herramienta                                               |
| ------------------------- | --------------------------------------------------------- |
| Derivar                   | cálculo en render, `useMemo` o selector                   |
| Fuente externa leída      | `useSyncExternalStore`                                    |
| Suscripción o recurso     | `useEffect` con cleanup (baja, `dispose`, `clearTimeout`) |
| Callback como dependencia | `useCallback` con deps reales                             |
| Estado de vista efímero   | `useState`, con JSDoc si el motivo no se ve               |

- `useEffect` **nunca** deriva ni copia props a estado.
- Deps `[]` solo cuando el efecto posee un ciclo de vida completo, con comentario. Opciones que
  cambian van a un `useRef`, no se esconden de la regla de hooks.
- Un hook por archivo, `useThing.ts`, en `hooks/` de su dueño; la lógica pura que envuelve baja
  a `lib/`. El nombre del archivo es el del hook.
- Lo que sobrevive a cambiar de pestaña vive en el store, no en `useState`.

## Store (zustand)

Un store vanilla por feature; el slice es **dato** (tipo + `initialX()`), las acciones viven en
el store. Detalle y ejemplo → [references/store.md](references/store.md).

- Un selector por dato; un objeto nuevo por lectura repinta siempre.
- Acciones extraídas una a una: son estables.
- Dentro de un callback, lectura imperativa con `store.getState()`.

## Eventos

```tsx
onKeyDown={(event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
        return;
    }

    event.preventDefault();
    onSelect(item.id);
}}
```

- Handler con llaves siempre.
- Fila activable: `Enter` y `Espacio` llaman al mismo callback.
- Un campo dentro de una fila activable hace `stopPropagation()` en todo `keydown`, antes de
  mirar la tecla.

## Texto y controles

- Cero texto de interfaz en JSX, incluidos `aria-label` y placeholders: todo sale del paquete de
  i18n. Idioma base inglés; el tipo de mensajes se deriva de él, y una clave sin traducir no
  compila.
- Controles nativos (`button`, `input`, `select`, `textarea`, `option`) e imports de la librería
  de primitivas solo dentro del paquete de UI. Falta una primitiva → se añade allí. Glifos: skill
  de diseño.

## Clases

```tsx
className={cn(
    'flex min-w-0 items-center gap-gap-icon-text',
    'h-row shrink-0 px-pad-control',
    'rounded-md text-text-secondary',
    'text-sm',
    'hover:bg-surface-control-hover',
    selected && 'bg-surface-selected',
)}
```

- `cn()` con un grupo por cadena, en orden: custom · layout · caja · pintura · tipografía ·
  estado.
- Lista estática sin condiciones → constante de módulo con nombre. `cva` con la base como array;
  dos ejes de variante justifican `cva`, uno es un mapa tipado.
- Nunca utilities interpoladas (`` `bg-${tone}` ``) ni valores arbitrarios (`[…]`).
- Sin atributo `style`. Geometría de runtime por `data-*`, resuelta en CSS.
