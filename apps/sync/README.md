# Mandor Request

La aplicación de escritorio síncrona. Su código, `apps/sync`, solo compone paquetes
compartidos. Abre su repo local en `Mandor/request/local/` y trabaja requests HTTP
y GraphQL con respuesta, historial y auth heredada; importa OpenAPI, Swagger,
Postman y HAR, exporta OpenAPI 3.1, pega curl y genera snippets.

## Desarrollo

```powershell
npm run dev -w apps/sync
```

## Instaladores

```powershell
npm run dist -w apps/sync
```

El resultado local queda en `apps/sync/dist`. La configuración declara NSIS,
DMG, AppImage y deb. El workflow `installers` construye cada formato en su sistema en el PR a `main`
que toca el empaquetado, sin publicar nada; en local, `npm run ci:installers` construye AppImage y deb
de las dos apps en Docker.

La ventana y los instaladores llevan el cohete naranja de `resources/icon.png` e
`icon.ico`. La firma y la notarización usan las mismas variables que documenta
[Mandor Realtime](../async/README.md).
