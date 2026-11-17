import { describe, expect, it } from 'vitest';

import {
    applyConnectionEffects,
    handshakePhoto,
    untouched,
    wroteHandshake,
    writtenKeys,
    type ConnectionTemplate,
} from '../../../../src/main/ws/connection-effects.js';

type Effects = Parameters<typeof applyConnectionEffects>[1];

const TEMPLATE: ConnectionTemplate = {
    url: 'wss://{{host}}/socket',
    headers: { Authorization: 'Bearer {{token}}', 'X-Trace': 'a' },
    params: [
        { key: 'page', value: '1', enabled: true },
        { key: 'off', value: 'x', enabled: false },
    ],
};

function header(op: 'set' | 'delete', name: string, value?: string): Effects[number] {
    return {
        kind: 'header',
        op,
        name,
        ...(value === undefined ? {} : { value }),
    };
}

function query(op: 'set' | 'delete', name: string, value?: string): Effects[number] {
    return {
        kind: 'query',
        op,
        name,
        ...(value === undefined ? {} : { value }),
    };
}

describe('the effects of a script on a handshake', () => {
    it('leaves it untouched with nothing written', () => {
        const applied = untouched(TEMPLATE);

        expect(applied.template).toBe(TEMPLATE);
        expect(wroteHandshake(applied)).toBe(false);
        expect(writtenKeys(applied)).toEqual(new Set());
    });

    it('sets a header in any case, keeping the case the person wrote', () => {
        const applied = applyConnectionEffects(TEMPLATE, [header('set', 'x-trace', 'b')]);

        expect(applied.template.headers).toEqual({
            Authorization: 'Bearer {{token}}',
            'X-Trace': 'b',
        });
        expect(writtenKeys(applied)).toEqual(new Set(['header:X-Trace']));
    });

    it('takes a header out, and counts it as written', () => {
        const applied = applyConnectionEffects(TEMPLATE, [header('delete', 'AUTHORIZATION')]);

        expect(applied.template.headers).toEqual({ 'X-Trace': 'a' });
        expect(wroteHandshake(applied)).toBe(true);
        expect(writtenKeys(applied)).toEqual(new Set());
    });

    it('marks the Host line, set or taken out', () => {
        expect(applyConnectionEffects(TEMPLATE, [header('set', 'Host', 'x')]).wroteHost).toBe(true);
        expect(applyConnectionEffects(TEMPLATE, [header('delete', 'host')]).wroteHost).toBe(true);
        expect(applyConnectionEffects(TEMPLATE, [header('set', 'X-Host', 'x')]).wroteHost).toBe(
            false,
        );
    });

    it('replaces a param line of the same name, and knows it by where it stands now', () => {
        const applied = applyConnectionEffects(TEMPLATE, [query('set', 'page', '2')]);

        expect(applied.template.params).toEqual([
            { key: 'off', value: 'x', enabled: false },
            { key: 'page', value: '2', enabled: true },
        ]);
        expect(writtenKeys(applied)).toEqual(new Set(['param:1:key', 'param:1:value']));
    });

    it('follows a written line when a delete before it moves the indexes', () => {
        const applied = applyConnectionEffects(TEMPLATE, [
            query('set', 'sort', 'asc'),
            query('delete', 'page'),
        ]);

        expect(applied.template.params).toEqual([
            { key: 'off', value: 'x', enabled: false },
            { key: 'sort', value: 'asc', enabled: true },
        ]);
        expect(writtenKeys(applied)).toEqual(new Set(['param:1:key', 'param:1:value']));
    });

    it('sets the url, and writes nothing for a value, the socket, the method or the body', () => {
        const applied = applyConnectionEffects(TEMPLATE, [
            { kind: 'var', name: 'a', value: '1' },
            { kind: 'url', value: 'wss://elsewhere.example' },
        ] as Effects);

        expect(applied.template.url).toBe('wss://elsewhere.example');
        expect(writtenKeys(applied)).toEqual(new Set(['url']));
    });
});

describe('the handshake a script sees', () => {
    it('is the templates as written, the GET of an upgrade, and the params that are on', () => {
        expect(handshakePhoto(TEMPLATE)).toEqual({
            url: 'wss://{{host}}/socket',
            method: 'GET',
            headers: [
                { name: 'Authorization', value: 'Bearer {{token}}' },
                { name: 'X-Trace', value: 'a' },
            ],
            query: [{ name: 'page', value: '1' }],
        });
    });
});
