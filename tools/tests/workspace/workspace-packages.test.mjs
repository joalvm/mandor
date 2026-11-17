import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { packageClasses, workspacePackages } from '../../workspace/workspace-packages.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

let root = '';

async function aPackage(dir, manifest) {
    await mkdir(join(root, 'packages', dir), { recursive: true });
    await writeFile(join(root, 'packages', dir, 'package.json'), JSON.stringify(manifest));
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-workspace-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the packages of the workspace (workspacePackages)', () => {
    it('reads each package from its manifest, in the order of its folder name', async () => {
        await aPackage('vars', { name: '@mandor/vars' });
        await aPackage('schema', { name: '@mandor/schema', dependencies: { zod: '4.4.3' } });

        expect(workspacePackages(root)).toEqual([
            { name: '@mandor/schema', dir: 'schema', internal: [], layer: 'pure' },
            { name: '@mandor/vars', dir: 'vars', internal: [], layer: 'pure' },
        ]);
    });

    it('puts a package that draws with react in the dom layer', async () => {
        await aPackage('shell', {
            name: '@mandor/shell',
            dependencies: { '@mandor/ipc': '0.0.0', react: '19.2.0' },
        });

        expect(workspacePackages(root)).toEqual([
            { name: '@mandor/shell', dir: 'shell', internal: ['@mandor/ipc'], layer: 'dom' },
        ]);
    });

    it('puts a package that needs electron, even only to type it, in the platform layer', async () => {
        await aPackage('host', {
            name: '@mandor/host',
            dependencies: { '@mandor/schema': '0.0.0' },
            devDependencies: { electron: '43.4.1' },
        });

        expect(workspacePackages(root)[0]?.layer).toBe('platform');
    });

    it('skips a folder with no manifest: it is not a package yet', async () => {
        await mkdir(join(root, 'packages', 'draft'), { recursive: true });
        await aPackage('ipc', { name: '@mandor/ipc' });

        expect(workspacePackages(root).map((each) => each.dir)).toEqual(['ipc']);
    });

    it('sorts the packages of this repository into the three layers of the architecture', () => {
        const layers = Object.fromEntries(
            workspacePackages(ROOT).map((each) => [each.dir, each.layer]),
        );

        expect(layers).toMatchObject({
            schema: 'pure',
            'store-fs': 'pure',
            ipc: 'pure',
            'interop-formats': 'pure',
            'transport-async': 'pure',
            host: 'platform',
            ui: 'dom',
            shell: 'dom',
            collections: 'dom',
        });
    });
});

describe('the classes the frontier rules name (packageClasses)', () => {
    it('calls a feature what draws and mounts in shell, and pure what needs neither runtime', async () => {
        await aPackage('shell', { name: '@mandor/shell', dependencies: { react: '19.2.0' } });
        await aPackage('ui', { name: '@mandor/ui', dependencies: { react: '19.2.0' } });
        await aPackage('env', {
            name: '@mandor/env',
            dependencies: { '@mandor/shell': '0.0.0', react: '19.2.0' },
        });
        await aPackage('vars', { name: '@mandor/vars' });

        expect(packageClasses(root)).toEqual({ features: ['env'], pure: ['vars'] });
    });
});
