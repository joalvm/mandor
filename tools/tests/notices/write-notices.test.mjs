import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeNotices } from '../../notices/write-notices.mjs';

const made = [];

function put(dir, manifest, files = {}) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest), 'utf8');

    for (const [name, text] of Object.entries(files)) {
        writeFileSync(join(dir, name), text, 'utf8');
    }
}

function bundled(app, target, record) {
    const dir = join(app, 'out', 'licenses');

    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `bundled-${target}.json`), JSON.stringify(record), 'utf8');
}

/** A repo with an app that loads `a`, bundles React and the ui package, which asks for `c`. */
function repo() {
    const root = mkdtempSync(join(tmpdir(), 'mandor-write-notices-'));
    const app = join(root, 'apps', 'one');
    const none = { packages: [], workspaces: [] };

    made.push(root);
    put(app, { name: 'one', dependencies: { a: '1.0.0' } });
    put(join(root, 'packages', 'ui'), { name: '@mandor/ui', dependencies: { c: '1.0.0' } });
    put(join(root, 'node_modules', 'a'), { name: 'a', version: '1.0.0', license: 'MIT' });
    put(join(root, 'node_modules', 'c'), { name: 'c', version: '3.0.0', license: 'OFL-1.1' });
    put(join(root, 'node_modules', 'react'), { name: 'react', version: '19.0.0', license: 'MIT' });
    put(
        join(root, 'node_modules', 'electron'),
        { name: 'electron', version: '45.0.0', license: 'MIT' },
        { LICENSE: 'Copyright (c) Electron contributors' },
    );
    bundled(app, 'main', none);
    bundled(app, 'preload', none);

    return { root, app };
}

afterEach(() => {
    for (const dir of made.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

describe('the notices an installer carries', () => {
    it('cover what the app bundles, what it loads and Electron itself', () => {
        const { root, app } = repo();

        bundled(app, 'renderer', {
            packages: [join(root, 'node_modules', 'react')],
            workspaces: [join(root, 'packages', 'ui')],
        });

        expect(writeNotices(app)).toBe(4);

        const text = readFileSync(join(app, 'out', 'licenses', 'THIRD-PARTY-NOTICES.txt'), 'utf8');

        expect(text).toContain('a 1.0.0');
        expect(text).toContain('c 3.0.0');
        expect(text).toContain('react 19.0.0');
        expect(text).toContain('Copyright (c) Electron contributors');
        expect(text).not.toContain(root);
    });

    it('fail when a part of the build left no record of what it bundled', () => {
        const { app } = repo();

        expect(() => writeNotices(app)).toThrow(/renderer/u);
    });
});
