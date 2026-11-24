import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';
import {
    collectionFingerprint,
    folderFingerprint,
} from '../../src/resource/collection-fingerprint.js';

const AUTH = { type: 'bearer', token: '{{t}}' };

describe('the fingerprint of what a level owns', () => {
    it('stays what it was for a level with only what older imports wrote', () => {
        expect(folderFingerprint({ auth: AUTH })).toBe(fingerprintOf({ auth: AUTH }));
        expect(collectionFingerprint({ name: 'Uno', description: 'd', auth: AUTH })).toBe(
            fingerprintOf({ name: 'Uno', description: 'd', auth: AUTH }),
        );
    });

    it.each([
        ['description', { description: 'd' }],
        ['variables', { variables: [{ name: 'a' }] }],
        ['auth', { auth: AUTH }],
        ['headers', { headers: [{ key: 'a' }] }],
        ['scripts', { scripts: { onResponse: { source: 'a()' } } }],
    ])('changes with the %s', (_name, settings) => {
        expect(folderFingerprint(settings)).not.toBe(folderFingerprint({}));
        expect(collectionFingerprint({ name: 'Uno', ...settings })).not.toBe(
            collectionFingerprint({ name: 'Uno' }),
        );
    });

    it('reads an empty list as none: a file with no key says the same', () => {
        expect(folderFingerprint({ variables: [], headers: [] })).toBe(folderFingerprint({}));
    });

    it('leaves the name of a folder out: a person who renames one edited nothing', () => {
        expect(folderFingerprint({ auth: AUTH, name: 'Otro' } as object)).toBe(
            folderFingerprint({ auth: AUTH }),
        );
    });
});
