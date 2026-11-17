import { describe, expect, it } from 'vitest';

import { scriptRunInputSchema, scriptRunOutputSchema } from '../../src/contract/script-run.js';

const SNAPSHOT = {
    variables: [
        { name: 'host', value: 'api.test' },
        { name: 'token', withheld: true },
    ],
    info: { event: 'onBeforeRequest', name: 'Pedido' },
};

describe('scriptRunInputSchema', () => {
    it.each([
        ['a request event', { event: 'onBeforeRequest', source: 'a()', snapshot: SNAPSHOT }],
        ['a connection event', { event: 'onMessage', source: 'a()', snapshot: SNAPSHOT }],
        [
            'a snapshot with request, response and message',
            {
                event: 'onResponse',
                source: '',
                snapshot: {
                    ...SNAPSHOT,
                    request: {
                        url: 'http://x/{{id}}',
                        method: 'GET',
                        headers: [{ name: 'a', value: 'b' }],
                        query: [],
                        body: { type: 'json', text: '{}' },
                    },
                    response: { status: 200, headers: [], text: '{}', bodyBytes: 2, timeMs: 12 },
                    message: { text: 'hi', direction: 'incoming', binary: false, event: 'ping' },
                },
            },
        ],
    ])('accepts %s', (_name, input) => {
        expect(scriptRunInputSchema.safeParse(input).success).toBe(true);
    });

    it.each([
        ['an event of no kind', { event: 'onFuture', source: 'a()', snapshot: SNAPSHOT }],
        ['a source that is no text', { event: 'onResponse', source: 1, snapshot: SNAPSHOT }],
        [
            'a variable that carries a value and is withheld',
            {
                event: 'onResponse',
                source: '',
                snapshot: { ...SNAPSHOT, variables: [{ name: 'a', value: 'x', withheld: true }] },
            },
        ],
        [
            'a variable with neither value nor withheld',
            {
                event: 'onResponse',
                source: '',
                snapshot: { ...SNAPSHOT, variables: [{ name: 'a' }] },
            },
        ],
        [
            'a snapshot with no info',
            { event: 'onResponse', source: '', snapshot: { variables: [] } },
        ],
    ])('refuses %s', (_name, input) => {
        expect(scriptRunInputSchema.safeParse(input).success).toBe(false);
    });
});

describe('scriptRunOutputSchema', () => {
    it('accepts every effect a script can ask for, with logs, tests and an error', () => {
        const output = {
            effects: [
                { kind: 'var', name: 'a', value: '1' },
                { kind: 'header', name: 'x-a', op: 'set', value: '1' },
                { kind: 'header', name: 'x-a', op: 'delete' },
                { kind: 'query', name: 'q', op: 'set', value: '1' },
                { kind: 'url', value: 'http://x' },
                { kind: 'method', value: 'POST' },
                { kind: 'body', type: 'json', value: '{}' },
                { kind: 'socket', value: 'hola' },
            ],
            logs: [{ level: 'log', text: 'hi' }],
            tests: [{ name: 'ok', passed: true }],
            error: { message: 'boom', errorName: 'Error' },
        };

        expect(scriptRunOutputSchema.parse(output)).toEqual(output);
    });

    it.each([
        ['an effect of no kind', { kind: 'eval', value: 'x' }],
        ['a header with no operation', { kind: 'header', name: 'a' }],
        ['a var with a value that is no text', { kind: 'var', name: 'a', value: 1 }],
        ['a body of a type a script cannot write', { kind: 'body', type: 'form', value: '' }],
    ])('refuses %s', (_name, effect) => {
        expect(
            scriptRunOutputSchema.safeParse({ effects: [effect], logs: [], tests: [] }).success,
        ).toBe(false);
    });

    it('refuses an output with no logs or no tests: the worker always says them', () => {
        expect(scriptRunOutputSchema.safeParse({ effects: [], tests: [] }).success).toBe(false);
        expect(scriptRunOutputSchema.safeParse({ effects: [], logs: [] }).success).toBe(false);
    });
});
