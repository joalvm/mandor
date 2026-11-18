# Composition

Cómo se piensa una pantalla en componentes y cómo se sustituye cada antipatrón de la tabla de la
skill. La regla no cambia aquí: nada de componentes, marcado ni funciones que pintan por props.

## Pensar en componentes

1. **Dibujar el árbol antes del código.** La pantalla se parte en zonas y cada zona en partes,
   con nombre: `OrderPage` → `OrderSummary`, `LineItems`, `PaymentForm`. Cada nombre es un
   componente o una parte de uno. Si no tiene nombre, todavía no es un componente.
2. **Contenedor o hoja, nunca los dos.**
    - El **contenedor** da forma: estructura, foco, teclado, apertura y cierre. Recibe
      `children` y no sabe qué lleva dentro.
    - La **hoja** sabe de su dato: lo lee de su store o de su contexto y lo dibuja. No recibe
      marcado.
3. **El dato baja por contexto o se lee en la hoja, no por props encadenadas.** Una prop que
   un nivel solo reenvía señala la hoja que debería leer por sí misma.
4. **El JSX se lee como la pantalla.** Leído de arriba abajo, nombra lo que el usuario ve en
   ese orden. Si para saber qué hay en una zona hay que abrir otro archivo y seguir una prop,
   la composición está rota.
5. **Extraer por costura**, no por tamaño: se repite, cambia por su cuenta, tiene estado propio
   o tiene nombre propio.

## Sustituciones

### Marcado por prop → parte hija

```tsx
// Prohibido
<Section title="Headers" actions={<Button>Add</Button>} empty={<Hint />} />

// Así
<Section>
    <SectionHeader>
        <SectionTitle>{t.headers}</SectionTitle>
        <SectionActions>
            <AddHeaderButton />
        </SectionActions>
    </SectionHeader>
    <HeaderList />
</Section>
```

El vacío lo decide la hoja que conoce el dato (`HeaderList` pinta su propio estado vacío), no el
contenedor.

### Función que pinta → parte que lee su contexto

```tsx
// Prohibido
<List items={items} renderItem={(item) => <Row item={item} />} />

// Así
<List>
    {items.map((item) => (
        <ListItem id={item.id} key={item.id}>
            <ItemRow />
        </ListItem>
    ))}
</List>

function ItemRow() {
    const { id } = useListItem();
    const item = useItems((state) => state.byId[id]);
    …
}
```

### Componente como valor → el padre escribe el elemento

```tsx
// Prohibido
<Card as={Link} href={url} />
<Toolbar ButtonComponent={IconButton} />

// Así
<Card>
    <CardLink href={url}>…</CardLink>
</Card>
<Toolbar>
    <IconButton … />
</Toolbar>
```

Si una primitiva debe prestar su comportamiento a otro elemento, lo hace dentro de la librería
de UI (el patrón «el hijo es el elemento»), y desde fuera se lee igual: un hijo en el árbol.

### Configuración que dibuja → descriptores de datos

```tsx
// Prohibido
<Table columns={[{ key: 'name', render: (row) => <strong>{row.name}</strong> }]} />;

// Así: los descriptores son datos; cada celda es un componente del árbol
const COLUMNS = [{ id: 'name' }, { id: 'size' }] as const;

<Table columns={COLUMNS}>
    {rows.map((row) => (
        <TableRow id={row.id} key={row.id}>
            <NameCell />
            <SizeCell />
        </TableRow>
    ))}
</Table>;
```

### Inyectar por envoltura → contexto del contenedor

`cloneElement`, `Children.map` que añade props y los componentes de orden superior esconden de
dónde sale cada valor. El contenedor publica lo que sus partes necesitan en un contexto; cada
parte lo lee con un hook (`useTabs`, `useSection`). La lógica que se comparte va a un hook.

### Booleanas de modo y componente dios → variantes o componentes

```tsx
// Prohibido
<Panel compact bordered withHeader mode="response" />

// Así
<ResponsePanel />            // un componente por caso
<Button variant="ghost" />   // un eje tipado cuando de verdad es el mismo componente
```

Dos booleanas que se combinan son cuatro componentes escondidos en uno. Elegir entre casos se
hace con una tabla tipada, no con `if` ni `switch` sobre un `kind`.

### Componente dentro de componente

```tsx
// Prohibido: Row es un tipo nuevo en cada render; React desmonta y monta, se pierde el foco
function List() {
    function Row() { … }
    return <Row />;
}

// Así: a nivel de módulo, o en su propio archivo
function Row() { … }
```

### Se coloca a sí mismo → el padre reparte

Un componente no lleva margen exterior, ancho ni posición pensados para un sitio concreto. El
padre pone el hueco (`gap`), el tamaño y el sitio; el componente ocupa lo que le dan.

## Revisión

Antes de cerrar un componente:

- [ ] Ninguna prop distinta de `children` recibe un componente, un nodo o una función que
      devuelve uno.
- [ ] Ningún `render*`, `as`, `component`, `slots`, `cloneElement` ni `Children.map` que añade
      props.
- [ ] Ninguna `function` de componente declarada dentro de otra.
- [ ] Cada hoja lee lo que dibuja; ninguna prop atraviesa un nivel que no la usa.
- [ ] Sin booleanas que eligen modos; sin `mode` o `kind` que ramifica todo el render.
- [ ] El JSX, leído en orden, nombra lo que se ve en pantalla.
