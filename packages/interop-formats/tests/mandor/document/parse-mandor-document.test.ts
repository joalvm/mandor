import { ImportOtherAppError } from '@mandor/interop-core';
import { FormatVersionError } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { MandorParseError } from '../../../src/mandor/document/mandor-parse-error.js';
import { parseMandorDocument } from '../../../src/mandor/document/parse-mandor-document.js';
import { fixtureText } from '../support/sample-workspace.js';

const MINIMAL = 'mandor: workspace\nformatVersion: 1\napp: sync\nworkspace:\n  name: Tienda\n';

describe('parseMandorDocument', () => {
    it('reads a bundle whole, with what it left out filled in', () => {
        const bundle = parseMandorDocument(MINIMAL, 'sync');

        expect(bundle.workspace).toEqual({ name: 'Tienda', variables: [] });
        expect(bundle.collections).toEqual([]);
        expect(bundle.connections).toEqual([]);
    });

    it('reads the sample of each app as its own', () => {
        const sync = parseMandorDocument(fixtureText('sync-workspace.mandor.yaml'), 'sync');
        const async = parseMandorDocument(fixtureText('async-workspace.mandor.yaml'), 'async');

        expect(sync.collections[0]?.folders[0]?.items[0]?.name).toBe('borrarMascota');
        expect(async.connections[0]?.id).toBe('pedidos');
    });

    it('refuses a text that is not a workspace, whatever else it is', () => {
        expect(() => parseMandorDocument('openapi: 3.1.0\n', 'sync')).toThrow(MandorParseError);
        expect(() => parseMandorDocument('not yaml: [', 'sync')).toThrow(MandorParseError);
    });

    it.each([0, 3, 99])(
        'refuses the format version %s instead of reading part of it',
        (version) => {
            const text = MINIMAL.replace('formatVersion: 1', `formatVersion: ${String(version)}`);

            expect(() => parseMandorDocument(text, 'sync')).toThrow(FormatVersionError);
        },
    );

    it('says where the bundle is wrong, by the path of the field', () => {
        const text = MINIMAL.replace('name: Tienda', 'name: " "');

        expect(() => parseMandorDocument(text, 'sync')).toThrow(MandorParseError);
        expect(() => parseMandorDocument(text, 'sync')).toThrow(/workspace\.name/);
    });

    it('refuses a bundle of the other app and says which app it belongs to', () => {
        expect(() => parseMandorDocument(MINIMAL, 'async')).toThrow(ImportOtherAppError);
        expect(() => parseMandorDocument(MINIMAL, 'async')).toThrow(/sync/);
    });

    it('asks for the version before it asks for the rest', () => {
        const text = 'mandor: workspace\nformatVersion: 3\napp: nowhere\n';

        expect(() => parseMandorDocument(text, 'sync')).toThrow(FormatVersionError);
    });
});
