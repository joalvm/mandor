# Store (zustand vanilla)

Un store por feature (y uno por el cromo). No hay store global que los componga. Sin barril de
store: se importa el archivo que define el símbolo.

```
<feature>/
  things-store.ts       createThingsStore(), thingsStore
  things.slice.ts       ThingsSlice, initialThingsSlice()
  selectors.ts          selectThings, selectThingFor(id)
```

## Slice, acciones, fábrica

```ts
export type ThingsSlice = {
    activeId: string | null;
    things: Thing[];
};

export function initialThingsSlice(): ThingsSlice {
    return { activeId: null, things: [] };
}
```

```ts
export type ThingsStore = ThingsActions & ThingsSlice;
export type ThingsStoreApi = StoreApi<ThingsStore>;

function actionsFor(set: ThingsStoreApi['setState']): ThingsActions {
    const actions: ThingsActions = {
        reset: () => {
            set({ ...initialThingsSlice(), ...actions }, true);
        },
        setActive: (activeId) => {
            set({ activeId });
        },
    };

    return actions;
}

export function createThingsStore(): ThingsStoreApi {
    return createStore<ThingsStore>()((set) => ({ ...initialThingsSlice(), ...actionsFor(set) }));
}

export const thingsStore = createThingsStore();
```

- Orden del archivo: tipo de acciones, `actionsFor`, fábrica, instancia.
- Acciones como **propiedades función**, no métodos: zustand no liga `this`.
- Lo que el store necesita de fuera (el puente) entra por la fábrica; el test pasa un doble.
- `reset` con `true` **reemplaza** el estado: lo usan los tests y el cambio de contexto, para que
  no sobrevivan ids muertos.
- Sin Immer: spread explícito. Si nada cambió, se devuelve el mismo objeto y no se notifica.

## Qué vive dónde

| Dato                                | Dónde                                       |
| ----------------------------------- | ------------------------------------------- |
| Entidades leídas del disco          | store, como proyección                      |
| Estado vivo empujado por main       | store, indexado por recurso                 |
| Qué fila se renombra, qué menú abre | `useState` local                            |
| Payload grande                      | fuera del store, referenciado por id        |
| Búfer de actividad                  | store, acotado; mover la vista no lo pierde |

## Selectores

```ts
/** Module constant: the empty case keeps its identity between renders. */
const NO_THINGS: readonly Thing[] = [];

export function selectThings(state: ThingsStore): readonly Thing[] {
    return state.things.length === 0 ? NO_THINGS : state.things;
}

export function selectThingFor(id: string): (state: ThingsStore) => Thing | undefined {
    return (state) => state.things.find((entry) => entry.id === id);
}
```

- Simples `(state) => T`; parametrizados currificados, `selectXFor(id)`.
- Toda derivación vive en un selector, nunca en un efecto.
- Un selector no crea objetos nuevos por lectura; si debe combinar, se memoiza fuera o se leen
  los datos por separado.

## Lectura

```ts
const thing = useStore(thingsStore, selectThingFor(id));
const setActive = useStore(thingsStore, (state) => state.setActive);
```

- `useStore` de zustand con la instancia y un selector. Sin hooks envoltorio por store: un
  `useThingsStore` que ya exista se respeta, uno nuevo no se crea.
- Un selector por dato; acciones una por una (son estables y sirven de dependencia).
- En callbacks y fuera de React: `thingsStore.getState()`, sin suscribirse.
