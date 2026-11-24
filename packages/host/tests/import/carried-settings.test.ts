import { describe, expect, it } from 'vitest';

import {
    carriedBy,
    claimOf,
    holdsSettings,
    setByHand,
    settingsPatchOf,
} from '../../src/import/carried-settings.js';
import { folderEntry, ORIGIN } from './support/folder-entry.js';

const AUTH = { type: 'bearer', token: '{{t}}' } as const;
const VARIABLE = { name: 'a', value: '1', enabled: true, secret: false };
const HEADER = { key: 'X-A', value: '1', enabled: true };

describe('carriedBy', () => {
    it('reads each setting the entry brings', () => {
        const carried = carriedBy(
            folderEntry('demo/a', 'A', {
                description: 'd',
                variables: [VARIABLE],
                auth: AUTH,
                headers: [HEADER],
            }),
        );

        expect(carried).toMatchObject({
            description: 'd',
            variables: [VARIABLE],
            auth: AUTH,
            headers: [HEADER],
            scripts: {},
        });
    });

    it('takes `inherit` as no auth and a description that is no text as none', () => {
        const carried = carriedBy(
            folderEntry('demo/a', 'A', { description: 1, auth: { inherit: true } }),
        );

        expect(carried.auth).toBeUndefined();
        expect(carried.description).toBeUndefined();
    });

    it('refuses a secret variable: the file goes to git', () => {
        expect(() =>
            carriedBy(folderEntry('demo/a', 'A', { variables: [{ ...VARIABLE, secret: true }] })),
        ).toThrow();
    });
});

describe('settingsPatchOf', () => {
    it('leaves no key for an empty list, so the file says none', () => {
        expect(settingsPatchOf(carriedBy(folderEntry('demo/a', 'A')))).toEqual({
            description: undefined,
            variables: undefined,
            auth: undefined,
            headers: undefined,
            scripts: undefined,
        });
    });
});

describe('holdsSettings', () => {
    it.each([
        ['a description', { description: 'd' }],
        ['variables', { variables: [VARIABLE] }],
        ['an auth', { auth: AUTH }],
        ['headers', { headers: [HEADER] }],
    ])('says yes for %s', (_name, level) => {
        expect(holdsSettings(level)).toBe(true);
    });

    it('says no for empty lists', () => {
        expect(holdsSettings({ variables: [], headers: [], scripts: {} })).toBe(false);
    });
});

describe('setByHand', () => {
    const file = { name: 'A', order: [], description: 'd' };

    it('is false for a level that declares nothing', () => {
        expect(setByHand({ name: 'A', order: [] }, undefined, 'hash')).toBe(false);
    });

    it('is true for a level with no claim, or the claim of another source', () => {
        expect(setByHand(file, ORIGIN, 'hash')).toBe(true);
        expect(
            setByHand(
                { ...file, importOrigin: { kind: 'bruno', sourceId: 'x', fingerprint: 'hash' } },
                ORIGIN,
                'hash',
            ),
        ).toBe(true);
    });

    it('is false while the file still hashes as it was claimed, and true once it does not', () => {
        const claimed = { ...file, importOrigin: { ...ORIGIN, fingerprint: 'hash' } };

        expect(setByHand(claimed, ORIGIN, 'hash')).toBe(false);
        expect(setByHand(claimed, ORIGIN, 'other')).toBe(true);
        expect(setByHand(claimed, undefined, 'hash')).toBe(true);
    });
});

describe('claimOf', () => {
    it('claims with the hash for an origin, and nothing without one', () => {
        expect(claimOf(ORIGIN, 'hash')).toEqual({ ...ORIGIN, fingerprint: 'hash' });
        expect(claimOf(undefined, 'hash')).toBeUndefined();
    });
});
