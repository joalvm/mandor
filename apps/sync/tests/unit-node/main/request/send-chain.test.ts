import { describe, expect, it } from 'vitest';

import { scriptPlaceOf, varsOf } from '../../../../src/main/request/send-chain.js';

describe('varsOf', () => {
    it('keeps the values the scripts set, the last of a name, and nothing else they asked', () => {
        expect(
            varsOf([
                { kind: 'var', name: 'page', value: '1' },
                { kind: 'header', name: 'X-A', op: 'set', value: 'a' },
                { kind: 'var', name: 'page', value: '2' },
                { kind: 'var', name: 'token', value: 't' },
            ]),
        ).toEqual({ page: '2', token: 't' });
    });
});

describe('scriptPlaceOf', () => {
    it('places the values of the scripts by the origin, the workspace and the environment', () => {
        const place = { root: '/tmp/x', repo: 'demo', readSecret: () => Promise.resolve(null) };

        expect(scriptPlaceOf(place, { workspaceId: 'payments', environmentId: null })).toEqual({
            origin: 'demo',
            workspaceId: 'payments',
            environmentId: null,
        });
    });
});
