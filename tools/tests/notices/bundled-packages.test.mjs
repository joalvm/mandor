import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { bundledPackages } from '../../notices/bundled-packages.mjs';

const made = [];

afterEach(() => {
    for (const dir of made.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

describe('the packages a build bundles', () => {
    it('are written per target: the third-party ones and the ones of the repo', () => {
        const outDir = join(mkdtempSync(join(tmpdir(), 'mandor-bundled-')), 'licenses');

        made.push(outDir);

        const plugin = bundledPackages({ outDir, root: 'C:\\repo', target: 'renderer' });

        plugin.generateBundle(
            {},
            {
                'index.js': {
                    type: 'chunk',
                    moduleIds: [
                        'C:\\repo\\node_modules\\react\\index.js',
                        'C:/repo/node_modules/react/cjs/react.js',
                        'C:/repo/packages/ui/src/index.ts',
                        'C:/repo/packages/ui/src/styles/index.css',
                        'C:/repo/apps/sync/src/renderer/main.tsx',
                        '\0vite/preload-helper',
                    ],
                },
                'index.css': { type: 'asset', originalFileNames: [] },
            },
        );

        expect(JSON.parse(readFileSync(join(outDir, 'bundled-renderer.json'), 'utf8'))).toEqual({
            packages: ['C:/repo/node_modules/react'],
            workspaces: ['C:/repo/packages/ui'],
        });
        expect(plugin.apply).toBe('build');
    });
});
