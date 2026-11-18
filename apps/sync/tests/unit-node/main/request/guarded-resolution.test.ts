import { variableScopeOf, type EnvironmentScope } from '@mandor/host';
import {
    createRequestItem,
    type FolderChainLevel,
    type RequestItem,
    type RequestLine,
} from '@mandor/schema';
import { resolveTemplates } from '@mandor/vars';
import { describe, expect, it } from 'vitest';

import {
    applyScriptEffects,
    noEffects,
    type AppliedEffects,
} from '../../../../src/main/request/apply-script-effects.js';
import {
    guardedRequest,
    guardedResolution,
    type SendGuard,
} from '../../../../src/main/request/guarded-resolution.js';
import { sentHeaders } from '../../../../src/main/request/request-photo.js';
import { requestTemplates } from '../../../../src/main/request/request-templates.js';

function line(key: string, value: string): RequestLine {
    return { key, value, enabled: true };
}

function level(
    kind: 'collection' | 'folder',
    name: string,
    headers: RequestLine[],
): FolderChainLevel {
    return { level: kind, place: { kind: 'folder', path: name }, name, settings: { headers } };
}

// The closest level first, as the disk gives it.
const SCOPE: EnvironmentScope = {
    environment: null,
    values: { baseUrl: 'https://api.test' },
    secrets: { token: 's3cr3t' },
    globals: { values: {}, secrets: { globalKey: 'g10bal' } },
    chain: [
        level('folder', 'Orders', [line('X-Folder', 'f')]),
        level('collection', 'Store', [line('X-Store', '{{token}}')]),
    ],
};

const REQUEST: RequestItem = {
    ...createRequestItem({ name: 'List' }),
    url: '{{baseUrl}}/orders',
    headers: [line('X-Old', 'o'), line('X-Mine', '{{token}}')],
    body: { type: 'text', content: 'hi {{token}}' },
};

function resolve(
    applied: AppliedEffects,
    script: Record<string, string> = {},
    scope: EnvironmentScope = SCOPE,
) {
    const guard: SendGuard = { scope, script, base: REQUEST, applied };
    const sent = sentHeaders(scope.chain, applied);
    const guarded = guardedResolution(
        guard,
        requestTemplates({ ...applied.request, headers: sent }),
        sent,
    );
    const values = Object.fromEntries(
        sent.map((header, index) => [
            header.key,
            guarded.resolved.values[`header:${String(index)}:value`],
        ]),
    );

    return { guarded, values, body: guarded.resolved.values['body'] };
}

describe('guardedResolution', () => {
    it('never resolves the secret in a header a script wrote, past inherited lines and a delete', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'header', name: 'X-Old', op: 'delete' },
            { kind: 'header', name: 'X-Api-Key', op: 'set', value: '{{token}}' },
        ]);
        const { guarded, values, body } = resolve(applied);

        expect(values).toEqual({
            'X-Store': 's3cr3t',
            'X-Folder': 'f',
            'X-Mine': 's3cr3t',
            'x-api-key': '{{token}}',
        });
        expect(body).toBe('hi s3cr3t');
        expect(guarded.verdict).toMatchObject({
            influenced: true,
            destinationMoved: false,
            sendOff: false,
            withheld: ['token'],
        });
    });

    it('names the headers and the body that still carry a secret, and every secret spelling', () => {
        const applied = applyScriptEffects(REQUEST, [{ kind: 'method', value: 'PUT' }]);
        const { guarded } = resolve(applied);

        expect(guarded.secrets.headers).toEqual(['X-Store', 'X-Mine']);
        expect(guarded.secrets.bodySecret).toBe(true);
        expect(guarded.secrets.spellings).toEqual(expect.arrayContaining(['s3cr3t', 'g10bal']));
    });

    it('sends nothing secret once a script moved the url to another origin', () => {
        const applied = applyScriptEffects(REQUEST, [
            { kind: 'url', value: 'https://evil.test/{{token}}' },
        ]);
        const { guarded, values, body } = resolve(applied);

        expect(guarded.verdict).toMatchObject({ sendOff: true, destinationMoved: true });
        expect(guarded.resolved.values['url']).toBe('https://evil.test/{{token}}');
        expect(values['X-Store']).toBe('{{token}}');
        expect(values['X-Mine']).toBe('{{token}}');
        expect(body).toBe('hi {{token}}');
        expect(guarded.verdict.fieldsOff('anything')).toBe(true);
    });

    it('sends nothing secret when a value of a script moves where the url points', () => {
        const { guarded, values } = resolve(noEffects(REQUEST), { baseUrl: 'https://evil.test' });

        expect(guarded.verdict).toMatchObject({ influenced: true, destinationMoved: true });
        expect(guarded.resolved.values['url']).toBe('https://evil.test/orders');
        expect(values['X-Mine']).toBe('{{token}}');
    });

    it('keeps the secrets of a send whose scripts stayed on the same origin', () => {
        const { guarded, values } = resolve(noEffects(REQUEST), { page: '2' });

        expect(guarded.verdict).toMatchObject({ influenced: false, destinationMoved: false });
        expect(values['X-Mine']).toBe('s3cr3t');
    });

    it('treats a Host a script touched, or one a script value moves, as a moved destination', () => {
        const wrote = resolve(
            applyScriptEffects(REQUEST, [{ kind: 'header', name: 'Host', op: 'delete' }]),
        );
        const withHost = { ...REQUEST, headers: [...REQUEST.headers, line('Host', '{{host}}')] };
        const moved = resolve(
            noEffects(withHost),
            { host: 'evil.test' },
            {
                ...SCOPE,
                values: { ...SCOPE.values, host: 'api.test' },
            },
        );

        expect(wrote.guarded.verdict.sendOff).toBe(true);
        expect(moved.guarded.verdict.sendOff).toBe(true);
        expect(moved.values['X-Mine']).toBe('{{token}}');
    });

    it('resolves byte for byte as before when no script set a value or wrote a line', () => {
        const applied = noEffects(REQUEST);
        const sent = sentHeaders(SCOPE.chain, applied);
        const templates = requestTemplates({ ...REQUEST, headers: sent });
        const { guarded } = resolve(applied);

        expect(guarded.resolved).toEqual(resolveTemplates(templates, variableScopeOf(SCOPE)));
        expect(guarded.verdict).toMatchObject({ influenced: false, sendOff: false, withheld: [] });
        expect(guarded.secrets).toEqual({ headers: [], bodySecret: false, spellings: [] });
    });

    it('adds the header names of an auth that carries a secret to what a hop must not take', () => {
        const { guarded } = resolve(
            applyScriptEffects(REQUEST, [{ kind: 'method', value: 'PUT' }]),
        );

        expect(guardedRequest(guarded, ['Authorization']).headers).toEqual([
            'X-Store',
            'X-Mine',
            'Authorization',
        ]);
    });
});
