import { degradation, type Degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { checkedAuth, loopbackPortOf, optionalField } from '../../src/import/auth-draft.js';

describe('a scheme with no equivalent', () => {
    it('enters the level with no auth and says which scheme was given up', () => {
        expect(checkedAuth(undefined, 'digest', 'folder')).toEqual({
            auth: { type: 'none' },
            degradations: [degradation('authNoEquivalentFolder', { type: 'digest' })],
        });
    });
});

describe('the workspace as the subject of an auth', () => {
    it('has no auth to write when it gives one up, and says it was the collection that asked', () => {
        const result = checkedAuth(undefined, 'ntlm', 'workspace');

        expect(result).toEqual({
            auth: undefined,
            degradations: [degradation('authNoEquivalentWorkspace', { type: 'ntlm' })],
        });
    });

    it('has no auth to write when the schema refuses the draft', () => {
        const result = checkedAuth(
            { auth: { type: 'bearer' }, degradations: [] },
            'bearer',
            'workspace',
        );

        expect(result.auth).toBeUndefined();
        expect(result.degradations).toEqual([
            degradation('authRefusedWorkspace', { type: 'bearer' }),
        ]);
    });
});

describe('checkedAuth', () => {
    it('gives up a scheme that has no draft', () => {
        const result = checkedAuth(undefined, 'ntlm', 'request');

        expect(result.auth).toEqual({ type: 'none' });
        expect(result.degradations).toEqual([
            degradation('authNoEquivalentRequest', { type: 'ntlm' }),
        ]);
    });

    it('gives up a draft that the schema of Mandor refuses, saying what it refused', () => {
        const result = checkedAuth(
            { auth: { type: 'bearer' }, degradations: [] },
            'bearer',
            'folder',
        );

        expect(result.auth).toEqual({ type: 'none' });
        expect(result.degradations).toEqual([degradation('authRefusedFolder', { type: 'bearer' })]);
    });

    it('holds a draft that fits and keeps what was said on the way', () => {
        const result = checkedAuth(
            {
                auth: { type: 'bearer', token: '{{token}}' },
                degradations: [degradation('pkceAlways')],
            },
            'bearer',
            'request',
        );

        expect(result).toEqual({
            auth: { type: 'bearer', token: '{{token}}' },
            degradations: [degradation('pkceAlways')],
        });
    });
});

describe('optionalField', () => {
    it('spells the field when the document wrote something', () => {
        expect(optionalField('scope', 'read')).toEqual({ scope: 'read' });
    });

    it('spells nothing for an empty text', () => {
        expect(optionalField('scope', '')).toEqual({});
    });
});

describe('loopbackPortOf', () => {
    it.each([
        ['http://127.0.0.1:8080/callback', 8080],
        ['http://localhost:49152', 49152],
        ['http://localhost:3000?x=1', 3000],
    ])('takes the port of %s', (url, port) => {
        const notes: Degradation[] = [];

        expect(loopbackPortOf(url, notes, 'URL')).toBe(port);
        expect(notes).toEqual([]);
    });

    it('says that an address that is not a loopback one is not used', () => {
        const notes: Degradation[] = [];

        expect(loopbackPortOf('https://app.example.com/cb', notes, 'URL')).toBeUndefined();
        expect(notes).toEqual([
            degradation('redirectNotUsed', { noun: 'URL', address: 'https://app.example.com/cb' }),
        ]);
    });

    it('names the address in the word the format has for it', () => {
        const notes: Degradation[] = [];

        loopbackPortOf('https://app.example.com/cb', notes, 'URI');

        expect(notes).toEqual([
            degradation('redirectNotUsed', { noun: 'URI', address: 'https://app.example.com/cb' }),
        ]);
    });

    it('says that a port out of range is not used', () => {
        const notes: Degradation[] = [];

        expect(loopbackPortOf('http://127.0.0.1:80/cb', notes, 'URL')).toBeUndefined();
        expect(notes).toEqual([
            degradation('redirectNotUsed', { noun: 'URL', address: 'http://127.0.0.1:80/cb' }),
        ]);
    });

    it('says nothing when the document wrote no address', () => {
        const notes: Degradation[] = [];

        expect(loopbackPortOf('', notes, 'URL')).toBeUndefined();
        expect(notes).toEqual([]);
    });
});
