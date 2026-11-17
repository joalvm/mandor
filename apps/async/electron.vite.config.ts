import { fileURLToPath } from 'node:url';
import { defineConfig } from 'electron-vite';

import { appBuildConfig } from '../../tools/workspace/app-build-config.mjs';

export default defineConfig(
    appBuildConfig({
        appDir: fileURLToPath(new URL('.', import.meta.url)),
        mainEntry: 'src/main/start-async.ts',
    }),
);
