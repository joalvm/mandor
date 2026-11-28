import type { KnipConfig } from 'knip';

const config: KnipConfig = {
    workspaces: {
        '.': {
            entry: [
                // The lab is no workspace and loads its pages by glob, so no import reaches them.
                'tools/ui-lab/src/**/*.{ts,tsx}',
                'tools/ui-lab/vite.config.ts',
                // The compose file runs it by path, which no script of the manifest says.
                'tools/ci/docker-qa.mjs',
                // Vitest aliases `electron` and `zustand` to these two: nothing imports them.
                'tools/vitest/electron.ts',
                'tools/vitest/stores.ts',
                // npm-check-updates reads it by its name.
                '.ncurc.cjs',
            ],
            ignore: [
                // Declarations of the `.mjs` beside them, for the files that check types over JS.
                'tools/workspace/*.d.mts',
                // The source of the website: `tools/site/build-site.mjs` copies it, never imports it.
                'site/**',
            ],
            // `tools/vitest/electron.ts` stands in for the binary, which the test only asks to be empty.
            ignoreDependencies: ['electron'],
        },
        'packages/transport-async': {
            // An npm override puts it in place of a package: only node_modules reaches it.
            ignore: ['vendor/**'],
        },
        'apps/async': {
            entry: ['src/main/start-*.ts', 'src/renderer/app/mount-*.tsx'],
            // The update test waits for the NSIS installer to end by asking Windows for its tasks.
            ignoreBinaries: ['tasklist'],
            ignoreDependencies: [
                // External in main: node loads it from the asar. electron-vite leaves out of the
                // main bundle every name the manifest of the app lists, and the transport that
                // main bundles requires `ws` at run time. The updater of the host is the same.
                'electron-updater',
                'ws',
            ],
        },
        'apps/sync': {
            entry: ['src/main/start-*.ts', 'src/renderer/app/mount-*.tsx'],
            ignoreDependencies: [
                // Same reason as `ws` in the other app: external in main, node loads it from
                // the asar, for the packages that main bundles.
                'electron-updater',
                'jsonc-parser',
                'undici',
            ],
        },
        'packages/icons': {
            // The generator reads the glyph sources from the package by the path in
            // `icon-sources.json`, never by an import.
            ignoreDependencies: ['@vscode/codicons'],
        },
    },
};

export default config;
