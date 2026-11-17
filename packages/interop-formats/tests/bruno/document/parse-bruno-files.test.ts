import { describe, expect, it } from 'vitest';

import { parseBrunoFiles } from '../../../src/bruno/document/parse-bruno-files.js';
import { folderFiles, folderFilesUnder } from '../support/fixture.js';

describe('parseBrunoFiles', () => {
    it('reads a collection of each layout with the reader of that layout', () => {
        const files = [...folderFilesUnder('oc', 'abierta'), ...folderFilesUnder('bru', 'clasica')];
        const documents = parseBrunoFiles(files);

        expect(documents.map((document) => document.name)).toEqual([
            'Tienda de Mascotas',
            'Tienda de Mascotas',
        ]);
        expect(documents.map((document) => document.skipped)).toEqual([[], []]);
    });

    it('gives the same tree from both layouts, but for what each one writes its own way', () => {
        const fromBru = parseBrunoFiles(folderFiles('bru'));
        const fromOc = parseBrunoFiles(folderFiles('oc'));
        const names = (documents: typeof fromBru) =>
            documents[0]?.children.map((node) => `${node.kind}:${node.name}`);

        expect(names(fromBru)).toEqual(names(fromOc));
        expect(fromBru[0]?.environments.map((each) => each.name)).toEqual(
            fromOc[0]?.environments.map((each) => each.name),
        );
    });

    it('gives nothing for files that hold no collection', () => {
        expect(parseBrunoFiles([{ path: 'a.yml', text: 'a: 1' }])).toEqual([]);
    });
});
