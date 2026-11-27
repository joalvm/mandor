import tailwindcss from '@tailwindcss/vite';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bundledPackages } from '../notices/bundled-packages.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * What a dependency ships for other bundlers and the bundler drops on its own: `"use client"` on
 * top of each file for React servers. Dozens per build that say nothing and bury the one that
 * does. A file of ours that carries one still warns.
 */
function quietDependencyWarnings(warning, warn) {
    if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.id?.includes('/node_modules/')) {
        return;
    }

    warn(warning);
}

/**
 * The build of an Electron app, which the two apps share but for the file main starts from.
 * Main bundles all it imports except what the manifest of the app lists under `dependencies`,
 * which is also all the installer carries in `node_modules`. So that list is what node must load
 * at run time and nothing else: the `@mandor/*` packages export their `src` and live under
 * `devDependencies`, like everything the bundles already hold.
 *
 * @param {{ appDir: string; mainEntry: string }} options `appDir` is the folder of the app
 */
export function appBuildConfig({ appDir, mainEntry }) {
    const entry = (path) => join(appDir, path);
    // What each bundle holds, for the notices of the installer: see tools/notices.
    const noted = (target) =>
        bundledPackages({ outDir: entry('out/licenses'), root: REPO, target });

    return {
        main: {
            build: {
                rolldownOptions: {
                    // Every import reads its files in a worker of its own, a second bundle beside
                    // main that loads no Electron: a shared document must never stop main. Scripts
                    // run in another one, for the same reason.
                    input: {
                        [basename(mainEntry, '.ts')]: entry(mainEntry),
                        'import-worker': entry('src/main/import-worker.ts'),
                        'script-worker': entry('src/main/script-worker.ts'),
                    },
                    onwarn: quietDependencyWarnings,
                },
            },
            plugins: [noted('main')],
        },
        preload: {
            build: {
                externalizeDeps: false,
                rolldownOptions: {
                    input: entry('src/preload/expose-bridge.ts'),
                    output: { entryFileNames: '[name].cjs', format: 'cjs' },
                    onwarn: quietDependencyWarnings,
                },
            },
            plugins: [noted('preload')],
        },
        // electron-vite leaves the window unminified. The editor alone is megabytes of script that
        // the window parses and keeps in memory once it loads, so the window is minified like any
        // page.
        renderer: {
            build: {
                minify: true,
                rolldownOptions: {
                    input: entry('src/renderer/index.html'),
                    onwarn: quietDependencyWarnings,
                },
            },
            plugins: [tailwindcss(), noted('renderer')],
        },
    };
}
