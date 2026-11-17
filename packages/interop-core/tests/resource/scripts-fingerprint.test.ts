import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';
import {
    collectionFingerprint,
    folderFingerprint,
} from '../../src/resource/collection-fingerprint.js';
import { collectionResourceOf } from '../../src/resource/collection-resource.js';

const ONE = { onResponse: { source: 'a()' } };
const OTHER = { onResponse: { source: 'b()' } };
const ORIGIN = { kind: 'openapi', sourceId: 'doc@1' } as const;

describe('the own scripts in what a re-import compares', () => {
    it('make a level a different one, and a change of their text counts', () => {
        expect(folderFingerprint({ scripts: ONE })).not.toBe(folderFingerprint({}));
        expect(folderFingerprint({ scripts: ONE })).not.toBe(folderFingerprint({ scripts: OTHER }));
        expect(collectionFingerprint({ name: 'Uno', scripts: ONE })).not.toBe(
            collectionFingerprint({ name: 'Uno', scripts: OTHER }),
        );
    });

    it('count as nothing when the map is empty, as a file with no key says', () => {
        expect(folderFingerprint({ scripts: {} })).toBe(folderFingerprint({}));
        expect(collectionFingerprint({ name: 'Uno', scripts: {} })).toBe(
            collectionFingerprint({ name: 'Uno' }),
        );
    });

    it('are told apart from the scripts an import brought', () => {
        expect(folderFingerprint({ scripts: ONE })).not.toBe(
            folderFingerprint({ importedScripts: ONE }),
        );
    });

    it('travel in the fields of the collection an import lands as', () => {
        const resource = collectionResourceOf({ name: 'Tienda', scripts: ONE, origin: ORIGIN });

        expect(resource.fields).toEqual({ name: 'Tienda', scripts: ONE });
        expect(resource.origin.fingerprint).toBe(
            collectionFingerprint({ name: 'Tienda', scripts: ONE }),
        );
    });

    it('leave the fields of a collection without them as they were', () => {
        expect(
            collectionResourceOf({ name: 'Tienda', scripts: {}, origin: ORIGIN }).fields,
        ).toEqual({ name: 'Tienda' });
    });

    it('count by their text in the fingerprint of a request', () => {
        const base = { name: 'a', method: 'GET' };

        expect(fingerprintOf({ ...base, scripts: ONE })).not.toBe(
            fingerprintOf({ ...base, scripts: OTHER }),
        );
    });
});
