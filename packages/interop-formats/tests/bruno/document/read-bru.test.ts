import lang from '@usebruno/lang';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import {
    collectionBruOf,
    environmentBruOf,
    requestBruOf,
} from '../../../src/bruno/document/read-bru.js';

function file(path: string, text: string) {
    return { path, text };
}

describe('read-bru', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('reads a request of the .bru language as the loose JSON the parser gives', () => {
        expect(requestBruOf(file('a.bru', 'get {\n  url: u\n}\n'))).toMatchObject({
            http: { method: 'get', url: 'u' },
        });
    });

    it('reads the folder.bru and the collection.bru, which share a language', () => {
        expect(collectionBruOf(file('folder.bru', 'docs {\n  Una nota\n}\n'))).toMatchObject({
            docs: 'Una nota',
        });
    });

    it('reads an environment', () => {
        expect(environmentBruOf(file('Prod.bru', 'vars {\n  a: 1\n}\n'))).toMatchObject({
            variables: [{ name: 'a', value: '1' }],
        });
    });

    it('says which file the parser refused and where, with the first line it gave', () => {
        expect(() => requestBruOf(file('Mascotas/Mal.bru', 'this is not bru'))).toThrow(
            new BrunoParseError(['Mascotas/Mal.bru: Line 1, col 1:']),
        );
        expect(() => collectionBruOf(file('folder.bru', 'headers {\n  a'))).toThrow(
            'folder.bru: Line 2, col 4:',
        );
        expect(() => environmentBruOf(file('environments/E.bru', 'vars {\n  a'))).toThrow(
            'environments/E.bru: Line 2, col 4:',
        );
    });

    it('says the file even when the parser throws something that is not an Error', () => {
        vi.spyOn(lang, 'bruToJsonV2').mockImplementation(() => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test
            throw 'a plain text\nand a second line';
        });

        expect(() => requestBruOf(file('Rota.bru', 'x'))).toThrow('Rota.bru: a plain text');
    });
});
