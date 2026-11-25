import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { normalizeIconSvg } from '../tools/normalize-icon-svg.mjs';
import { readIconSources } from '../tools/read-icon-sources.mjs';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const providerRoot = join(packageRoot, '../../node_modules/@vscode/codicons');

async function fixture(name: string) {
    return readFile(join(packageRoot, 'tests/fixtures', name), 'utf8');
}

const tempRoots: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
});

async function tempManifest(manifest: unknown) {
    const root = await mkdtemp(join(tmpdir(), 'mandor-icon-sources-'));

    tempRoots.push(root);
    await writeFile(
        join(root, 'icon-sources.json'),
        `${JSON.stringify(manifest, null, 4)}\n`,
        'utf8',
    );

    return root;
}

function codicon(id: string, sha256: string) {
    return {
        origin: 'codicons',
        id,
        sha256,
        license: 'CC-BY-4.0',
    };
}

// The pin is the version installed: a bump of the provider moves both, and these tests follow.
const installed = JSON.parse(await readFile(join(providerRoot, 'package.json'), 'utf8')) as {
    version: string;
};
const provider = { package: '@vscode/codicons', version: installed.version };

describe('normalize-icon-svg', () => {
    it('extracts every path of a real Codicon source, fill rule included', async () => {
        const xml = await fixture('fill-rule-evenodd.svg');
        const { paths } = normalizeIconSvg(xml, 'combine');

        expect(paths).toHaveLength(5);
        expect(paths.every(({ d }) => typeof d === 'string' && d.length > 0)).toBe(true);
        expect(paths.some(({ fillRule }) => fillRule === 'evenodd')).toBe(true);
        expect(xml).toContain(paths[0]?.d);
    });

    it('resolves what a path inherits from the root and the groups above it', () => {
        const { paths } = normalizeIconSvg(
            '<svg viewBox="0 0 16 16" fill="currentColor"><g fill-rule="evenodd">' +
                '<path d="M1 1h6v6H1z"/><path clip-rule="evenodd" d="M9 9h6v6H9z"/></g></svg>',
        );

        expect(paths).toEqual([
            { d: 'M1 1h6v6H1z', fillRule: 'evenodd' },
            { d: 'M9 9h6v6H9z', fillRule: 'evenodd', clipRule: 'evenodd' },
        ]);
    });

    it('rejects a canvas that is not the 16 grid', async () => {
        const xml = await fixture('rejected-viewbox.svg');

        expect(() => normalizeIconSvg(xml, 'wide')).toThrow(/viewBox/);
    });

    it('rejects geometry that is not a path', () => {
        const xml = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4"/></svg>';

        expect(() => normalizeIconSvg(xml, 'round')).toThrow(/<circle>/);
    });

    it('rejects live content, external references and scripted attributes', () => {
        const cases: [string, RegExp][] = [
            ['<use href="#x"/>', /<use>/],
            ['<image href="http://a/b.png"/>', /<image>/],
            ['<script type="text/javascript"/>', /<script>/],
            ['<path d="M1 1h2v2H1z" onload="x()"/>', /onload/],
            ['<g style="fill:red"><path d="M1 1h2v2H1z"/></g>', /style/],
        ];

        for (const [element, message] of cases) {
            const xml = `<svg viewBox="0 0 16 16">${element}<path d="M15 15h1v1h-1z"/></svg>`;

            expect(() => normalizeIconSvg(xml, 'live'), element).toThrow(message);
        }
    });

    it('rejects a transform and a foreign fill', () => {
        const cases: [string, RegExp][] = [
            ['<g transform="translate(2 2)"><path d="M1 1h2v2H1z"/></g>', /transform/],
            ['<path d="M1 1h2v2H1z" fill="none"/>', /fill "none"/],
        ];

        for (const [element, message] of cases) {
            const xml = `<svg viewBox="0 0 16 16" fill="currentColor">${element}</svg>`;

            expect(() => normalizeIconSvg(xml, 'edge'), element).toThrow(message);
        }
    });

    it('rejects a canvas with no path at all', () => {
        expect(() => normalizeIconSvg('<svg viewBox="0 0 16 16"/>', 'edge')).toThrow(/no path/);
    });
});

describe('read-icon-sources', () => {
    it('resolves every intention of the real manifest to the bytes of its source', async () => {
        const { provider: pinned, intentions } = await readIconSources();

        expect(pinned).toEqual(provider);
        expect(Object.keys(intentions)).toHaveLength(89);
        expect(intentions['add']?.svg).toContain('<path');
        expect(intentions['origin-bitbucket']?.svg).toContain('<path');
    });

    it('rejects a manifest whose provider drifted from the one installed', async () => {
        const root = await tempManifest({
            provider: { ...provider, version: '9.9.9' },
            intentions: {},
        });

        await expect(readIconSources({ packageRoot: root, providerRoot })).rejects.toThrow(
            `installed ${installed.version}`,
        );
    });

    it('rejects a source whose bytes no longer match the hash it cites', async () => {
        const root = await tempManifest({
            provider,
            intentions: { add: { state: 'candidate', source: codicon('add', 'deadbeef') } },
        });

        await expect(readIconSources({ packageRoot: root, providerRoot })).rejects.toThrow(
            /sha256/,
        );
    });

    it('rejects a source that is not there and a derived one without its base', async () => {
        const missing = await tempManifest({
            provider,
            intentions: { add: { state: 'candidate', source: codicon('no-such-icon', 'x') } },
        });
        const derived = await tempManifest({
            provider,
            intentions: {
                'wrap-text-off': {
                    state: 'candidate',
                    source: {
                        origin: 'derived',
                        file: 'authoring/a.svg',
                        sha256: 'x',
                        license: 'x',
                    },
                },
            },
        });

        await expect(readIconSources({ packageRoot: missing, providerRoot })).rejects.toThrow(
            /no-such-icon/,
        );
        await expect(readIconSources({ packageRoot: derived, providerRoot })).rejects.toThrow(
            /base/,
        );
    });
});
