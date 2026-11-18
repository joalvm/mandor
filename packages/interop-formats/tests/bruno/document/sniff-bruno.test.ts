import { describe, expect, it } from 'vitest';

import {
    brunoRootsOf,
    filesOfRoot,
    looksLikeBrunoFiles,
    type BrunoRoot,
} from '../../../src/bruno/document/sniff-bruno.js';
import { fixtureText, folderFiles, folderFilesUnder } from '../support/fixture.js';

const OC = { path: 'opencollection.yml', text: fixtureText('opencollection.yml') };
const BRU = { path: 'bruno.json', text: fixtureText('bruno.json') };

describe('brunoRootsOf', () => {
    it('tells a folder of OpenCollection by its root file', () => {
        expect(brunoRootsOf(folderFiles('oc'))).toEqual([{ dir: '', layout: 'opencollection' }]);
    });

    it('tells a folder of .bru files by its bruno.json', () => {
        expect(brunoRootsOf(folderFiles('bru'))).toEqual([{ dir: '', layout: 'bru' }]);
    });

    it('prefers OpenCollection when a folder keeps both root files', () => {
        expect(brunoRootsOf([BRU, OC])).toEqual([{ dir: '', layout: 'opencollection' }]);
        expect(brunoRootsOf([OC, BRU])).toEqual([{ dir: '', layout: 'opencollection' }]);
    });

    it('finds the collections of a folder that keeps several, by directory', () => {
        const files = [...folderFilesUnder('oc', 'b'), ...folderFilesUnder('bru', 'a')];

        expect(brunoRootsOf(files)).toEqual([
            { dir: 'a', layout: 'bru' },
            { dir: 'b', layout: 'opencollection' },
        ]);
    });

    it.each([
        ['an opencollection.yml that does not say so', 'opencollection.yml', 'info:\n  name: x\n'],
        ['an opencollection.yml that is no YAML record', 'opencollection.yml', '- a\n'],
        ['a bruno.json with no name', 'bruno.json', '{"version":"1"}'],
        ['a bruno.json whose name is no text', 'bruno.json', '{"name":1}'],
        ['a file that is neither', 'notes.json', '{"name":"x"}'],
    ])('does not take %s for a root', (_name, path, text) => {
        expect(brunoRootsOf([{ path, text }])).toEqual([]);
    });
});

describe('looksLikeBrunoFiles', () => {
    it('is true when the files hold at least one collection', () => {
        expect(looksLikeBrunoFiles([OC])).toBe(true);
        expect(looksLikeBrunoFiles([BRU])).toBe(true);
    });

    it('is false for files that hold none', () => {
        expect(looksLikeBrunoFiles([])).toBe(false);
        expect(looksLikeBrunoFiles([{ path: 'a.yml', text: 'a: 1' }])).toBe(false);
    });
});

function rootAt(roots: readonly BrunoRoot[], dir: string): BrunoRoot {
    const found = roots.find((root) => root.dir === dir);

    if (found === undefined) {
        throw new Error(`no root at "${dir}"`);
    }

    return found;
}

describe('filesOfRoot', () => {
    it('gives the files of the root with their paths relative to it', () => {
        const files = [...folderFilesUnder('oc', 'tienda'), { path: 'otro/x.yml', text: 'x' }];
        const roots = brunoRootsOf(files);
        const own = filesOfRoot(files, rootAt(roots, 'tienda'), roots);

        expect(own.map((file) => file.path)).toContain('Mascotas/folder.yml');
        expect(own).toHaveLength(folderFiles('oc').length);
    });

    it('keeps the files of a collection inside another one with the inner one', () => {
        const files = [...folderFiles('oc'), ...folderFilesUnder('bru', 'dentro')];
        const roots = brunoRootsOf(files);
        const outer = filesOfRoot(files, rootAt(roots, ''), roots);
        const inner = filesOfRoot(files, rootAt(roots, 'dentro'), roots);

        expect(outer.map((file) => file.path)).not.toContain('dentro/bruno.json');
        expect(inner.map((file) => file.path)).toContain('bruno.json');
    });
});
