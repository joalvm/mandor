import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { appBuildConfig } from '../../workspace/app-build-config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const APP_DIR = join(ROOT, 'apps/async');

describe('the build every Electron app shares (appBuildConfig)', () => {
    /**
     * Every import reads, and every script runs, in a thread of its own, from a bundle next to
     * main's. Main finds them by the names `import-worker.js` and `script-worker.js`, so the
     * entries have to keep those names.
     */
    it('starts main from the file the app names, and builds the two workers beside it', () => {
        const { main } = appBuildConfig({ appDir: APP_DIR, mainEntry: 'src/main/start-async.ts' });

        expect(main.build.rolldownOptions.input).toEqual({
            'start-async': join(APP_DIR, 'src/main/start-async.ts'),
            'import-worker': join(APP_DIR, 'src/main/import-worker.ts'),
            'script-worker': join(APP_DIR, 'src/main/script-worker.ts'),
        });
    });

    /**
     * What main leaves out of its bundle is what the installer carries: an @mandor package listed
     * there would be required as TypeScript, and the bundles of the window would ship twice.
     */
    it.each(['async', 'sync'])(
        'gives the installer of %s only what main loads at run time, never an @mandor package',
        (app) => {
            const manifest = JSON.parse(
                readFileSync(join(ROOT, 'apps', app, 'package.json'), 'utf8'),
            );
            const installed = Object.keys(manifest.dependencies);

            expect(installed).toContain('electron-updater');
            expect(installed.filter((name) => name.startsWith('@mandor/'))).toEqual([]);
        },
    );

    it('lays the preload out as one CommonJS file and bundles all it imports', () => {
        const { preload } = appBuildConfig({
            appDir: APP_DIR,
            mainEntry: 'src/main/start-async.ts',
        });

        expect(preload.build.externalizeDeps).toBe(false);
        expect(preload.build.rolldownOptions.input).toBe(
            join(APP_DIR, 'src/preload/expose-bridge.ts'),
        );
        expect(preload.build.rolldownOptions.output).toEqual({
            entryFileNames: '[name].cjs',
            format: 'cjs',
        });
    });

    it('minifies the window and gives it the stylesheet plugin', () => {
        const { renderer } = appBuildConfig({
            appDir: APP_DIR,
            mainEntry: 'src/main/start-async.ts',
        });

        expect(renderer.build.minify).toBe(true);
        expect(renderer.build.rolldownOptions.input).toBe(join(APP_DIR, 'src/renderer/index.html'));
        expect(renderer.plugins.length).toBeGreaterThan(0);
    });

    /** Dozens of them per build say nothing; one of ours that carries one still warns. */
    it.each(['main', 'preload', 'renderer'])(
        'drops in %s what a dependency ships for other bundlers, and passes every other warning on',
        (build) => {
            const config = appBuildConfig({
                appDir: APP_DIR,
                mainEntry: 'src/main/start-async.ts',
            });
            const passed = [];
            const warn = (warning) => passed.push(`${warning.code} ${warning.id ?? ''}`);
            const { onwarn } = config[build].build.rolldownOptions;

            onwarn(
                { code: 'MODULE_LEVEL_DIRECTIVE', id: '/repo/node_modules/radix-ui/a.mjs' },
                warn,
            );
            onwarn({ code: 'MODULE_LEVEL_DIRECTIVE', id: '/repo/packages/ui/src/menu.tsx' }, warn);
            onwarn({ code: 'CIRCULAR_DEPENDENCY' }, warn);

            expect(passed).toEqual([
                'MODULE_LEVEL_DIRECTIVE /repo/packages/ui/src/menu.tsx',
                'CIRCULAR_DEPENDENCY ',
            ]);
        },
    );
});
