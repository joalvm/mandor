# Desktop runtime: main, preload, IPC

La lógica vive en paquetes puros que no saben que existe el runtime de escritorio. Main solo
traduce: valida, llama, convierte el resultado.

## Ventana

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- CSP estricta. `setWindowOpenHandler` devuelve `deny`.
- Todo lo que se carga en desarrollo (extensiones de DevTools) se lee de disco local y nunca
  entra en producción.

## Contrato IPC

Un paquete de contrato: canales, tipos, el esquema zod de cada mensaje y los helpers de
`Result`. Sin handlers ni runtime de escritorio.

```ts
export const CHANNELS = { repoOpen: 'repo:open' } as const;

export type Result<T> =
    { ok: true; value: T } | { ok: false; error: { code: ErrorCode; message: string } };
```

- El string de un canal solo existe dentro de `CHANNELS`.
- `ErrorCode` es unión de literales. La UI decide y traduce por `code`; `message` va al log.
- Zod valida en **ambos** bordes. La amenaza real es la deriva de versión entre paquetes.
- Añadir una operación toca en el mismo commit canal, esquema, tipo del puente, preload, handler
  y doble de test. Todos o ninguno.
- El puente común lo atienden todas las apps; un área de una sola app vive junto a sus canales y
  la app la suma en su preload.

## Handler

```ts
export function registerThingHandlers(ipc: HandlerIpc, deps: ThingDeps): () => void {
    ipc.handle(CHANNELS.thingCreate, async (_event, raw: unknown) => {
        const request = thingCreateSchema.safeParse(raw);

        if (!request.success) {
            return failure('bad-request', request.error.message);
        }

        try {
            return success(await deps.createThing(request.data));
        } catch (error) {
            return failureOf(error);
        }
    });

    return () => {
        ipc.removeHandler(CHANNELS.thingCreate);
    };
}
```

- Forma fija: `registerXHandlers(ipc, deps)` que devuelve un disposer. El disposer quita cada
  handler y libera cada recurso.
- Payload `unknown`, validado antes de tocarlo. **Nada lanza a través del puente**: todo sale
  como `Result`.
- Se escribe con el kit de la plataforma (raíz activa, errores, push, diálogos). Copiarlo es la
  próxima divergencia.
- Handler común → paquete de plataforma. Handler de una app → `main/<area>/` de esa app, pasado
  a la plataforma en su arranque. La plataforma nunca pregunta qué app es.
- Push a la ventana solo tras comprobar que no está destruida.

## Preload

- Un único `contextBridge.exposeInMainWorld`, con un objeto literal tipado por el contrato: el
  compilador verifica que cubre todas las operaciones.
- Cada método es una línea: `call(CHANNELS.x, input)`. Las suscripciones devuelven su baja,
  nunca el emisor. `ipcRenderer` crudo no cruza jamás.
- En el renderer, un solo módulo lee el puente global y lo exporta tipado; el resto importa ese
  módulo.

## Transportes

Node puro, sin React ni runtime de escritorio, testeables sin arrancar nada.

- Una clase por transporte con la misma superficie: `open`, `send`, `close`, `dispose`, más un
  callback de eventos inyectado.
- La reconexión es política del gestor, no del socket.
- Búfer **acotado** que emite en **lotes**: un flujo de miles de mensajes por segundo no puede
  producir miles de IPC por segundo.
- Cada timer se guarda y se limpia en `dispose`. Un intervalo huérfano mantiene viva la app.
- El estado de dominio que main empuja (sockets, actividad) lo escucha el `register-*` de la
  feature al montar la app y lo escribe en su store. Un push que solo afecta a la vista puede
  escucharlo un hook, con `useEffect` y baja.

## Git

- Un único paquete invoca git. Una función por operación, sin estado compartido.
- Ningún camino usa `--force`, y un test busca la cadena en el paquete.
- Errores de git mapeados a códigos propios (`git-missing`, `git-auth`, `git-conflict`); el
  stderr crudo nunca llega a la UI. Sin git instalado, la app sigue en modo local.

## Gates de seguridad

- Un gate por riesgo, en su propio módulo, con nombre (`assertWsUrl`) y JSDoc que dice qué
  impide. Se prueba directo.
- Validan en main aunque el renderer ya haya validado.
- Esquemas de URL permitidos explícitos por transporte; ninguna redirección hacia `file:`.
- Ids de ruta validados por segmento: ni `..` ni separadores.
- Secretos en el almacén cifrado del sistema; en disco solo su referencia, en una carpeta
  ignorada por git.
- Ninguna cadena de interfaz expone rutas absolutas ni vocabulario interno de la
  implementación que el usuario no debe ver.
