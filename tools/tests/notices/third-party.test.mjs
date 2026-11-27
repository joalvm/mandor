import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
    licenseOf,
    noticesText,
    packageRootOf,
    dependencyRoots,
    readEntry,
} from '../../notices/third-party.mjs';

const made = [];

function folder() {
    const dir = mkdtempSync(join(tmpdir(), 'mandor-notices-'));

    made.push(dir);

    return dir;
}

function put(dir, manifest, files = {}) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest), 'utf8');

    for (const [name, text] of Object.entries(files)) {
        writeFileSync(join(dir, name), text, 'utf8');
    }
}

afterEach(() => {
    for (const dir of made.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

describe('the package a module of a bundle comes from', () => {
    it('is the folder under the last node_modules, scoped or not', () => {
        expect(packageRootOf('/repo/node_modules/react/index.js')).toBe('/repo/node_modules/react');
        expect(packageRootOf('/repo/node_modules/@scope/lib/dist/a.js')).toBe(
            '/repo/node_modules/@scope/lib',
        );
        expect(packageRootOf('/repo/node_modules/a/node_modules/b/x.js')).toBe(
            '/repo/node_modules/a/node_modules/b',
        );
    });

    it('reads a path of Windows and one with a query or a virtual prefix', () => {
        expect(packageRootOf('C:\\repo\\node_modules\\zod\\index.js')).toBe(
            'C:/repo/node_modules/zod',
        );
        expect(packageRootOf('\0/repo/node_modules/yaml/dist/x.js?commonjs-proxy')).toBe(
            '/repo/node_modules/yaml',
        );
    });

    it('is none for a file of the repo itself', () => {
        expect(packageRootOf('/repo/packages/ui/src/index.ts')).toBeUndefined();
        expect(packageRootOf('\0vite/preload-helper')).toBeUndefined();
    });
});

describe('the license a manifest declares', () => {
    it('reads the field in each of its shapes', () => {
        expect(licenseOf({ license: 'MIT' })).toBe('MIT');
        expect(licenseOf({ license: { type: 'ISC' } })).toBe('ISC');
        expect(licenseOf({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] })).toBe(
            'MIT OR Apache-2.0',
        );
        expect(licenseOf({})).toBe('UNKNOWN');
    });
});

describe('the notices text', () => {
    const entry = (name, version, texts = []) => ({
        name,
        version,
        license: 'MIT',
        source: `https://example.test/${name}`,
        texts,
    });

    it('lists each package once, by name and then version, with its license text', () => {
        const text = noticesText([
            entry('zod', '4.0.0', [{ file: 'LICENSE', text: 'Zod license' }]),
            entry('react', '19.0.0', [{ file: 'LICENSE', text: 'React license' }]),
            entry('zod', '4.0.0', [{ file: 'LICENSE', text: 'Zod license' }]),
        ]);

        expect(text.indexOf('react 19.0.0')).toBeLessThan(text.indexOf('zod 4.0.0'));
        expect(text.match(/zod 4\.0\.0/gu)).toHaveLength(1);
        expect(text).toContain('React license');
        expect(text).toContain('Source: https://example.test/react');
    });

    it('says which license a package declares when it ships no file of it', () => {
        expect(noticesText([entry('tiny', '1.0.0')])).toContain(
            'The package ships no license file; its manifest declares MIT.',
        );
        expect(noticesText([{ ...entry('old', '0.0.1'), license: 'UNKNOWN' }])).toContain(
            'The package ships no license file and its manifest names no license.',
        );
    });

    it('opens with the license of the app and the place of the Chromium notices', () => {
        const text = noticesText([]);

        expect(text).toContain('GNU Affero General Public License v3.0 only');
        expect(text).toContain('LICENSES.chromium.html');
    });
});

describe('a package read from disk', () => {
    it('carries its license and notice files, and no other file', () => {
        const root = join(folder(), 'node_modules', 'lib');

        put(
            root,
            { name: 'lib', version: '1.2.3', license: 'Apache-2.0', repository: 'x/lib' },
            {
                'LICENSE.md': 'license text',
                NOTICE: 'notice text',
                'README.md': 'readme',
            },
        );

        expect(readEntry(root)).toEqual({
            name: 'lib',
            version: '1.2.3',
            license: 'Apache-2.0',
            source: 'https://github.com/x/lib',
            texts: [
                { file: 'LICENSE.md', text: 'license text' },
                { file: 'NOTICE', text: 'notice text' },
            ],
        });
    });
});

describe('what the manifests of the app and its packages need at run time', () => {
    it('follows their dependencies through the folders node looks in, ours left out', () => {
        const repo = folder();
        const app = join(repo, 'apps', 'one');

        put(app, { name: 'one', dependencies: { a: '1.0.0', '@mandor/ui': '0.0.0' } });
        put(join(repo, 'packages', 'ui'), { name: '@mandor/ui', dependencies: { c: '1.0.0' } });
        put(join(repo, 'node_modules', 'c'), { name: 'c', version: '3.0.0' });
        put(join(repo, 'node_modules', 'a'), {
            name: 'a',
            version: '1.0.0',
            dependencies: { b: '1.0.0' },
            optionalDependencies: { missing: '1.0.0' },
        });
        put(join(repo, 'node_modules', 'a', 'node_modules', 'b'), {
            name: 'b',
            version: '2.0.0',
            dependencies: { a: '1.0.0' },
        });

        const roots = dependencyRoots([app, join(repo, 'packages', 'ui')]);
        const base = repo.replaceAll('\\', '/');

        expect(roots.map((root) => root.replaceAll('\\', '/'))).toEqual([
            `${base}/node_modules/a`,
            `${base}/node_modules/a/node_modules/b`,
            `${base}/node_modules/c`,
        ]);
    });

    it('fails on a dependency the manifest asks for and the disk lacks', () => {
        const app = join(folder(), 'app');

        put(app, { name: 'app', dependencies: { absent: '1.0.0' } });

        expect(() => dependencyRoots([app])).toThrow(/absent/u);
    });
});
