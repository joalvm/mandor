# Mandor Realtime

La aplicación de escritorio asíncrona. Su código, `apps/async`, solo compone paquetes
compartidos y selecciona el transporte asíncrono.

## Desarrollo

```powershell
npm run dev -w apps/async
npm run test:e2e -w apps/async
```

## Instaladores

```powershell
npm run dist -w apps/async
```

El resultado local queda en `apps/async/dist`. La configuración también declara
NSIS, DMG, AppImage y deb. El workflow `installers` construye cada formato en su sistema en el PR a
`main` que toca el empaquetado, sin publicar nada; en local, `npm run ci:installers` construye
AppImage y deb de las dos apps en Docker.

No se guardan certificados en el repositorio. `electron-builder` detectará estas
variables cuando existan credenciales reales:

- Windows y macOS: `CSC_LINK` y `CSC_KEY_PASSWORD`.
- Notarización de macOS: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` y
  `APPLE_TEAM_ID`.

Sin esas variables, el empaquetado local queda deliberadamente sin firma. La
firma y la notarización se habilitan al provisionar credenciales reales en CI.
