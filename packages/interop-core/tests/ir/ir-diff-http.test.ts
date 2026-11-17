import { describe, expect, it } from 'vitest';

import type { InteropHttpOperation, InteropOperation } from '../../src/ir/interop-document.js';
import { irDiff } from '../../src/ir/ir-diff.js';
import { documentOf } from '../support/interop-document.js';

function http(overrides: Partial<InteropHttpOperation> = {}): InteropHttpOperation {
    return {
        method: 'GET',
        path: '/pets',
        tags: [],
        parameters: [],
        responses: [],
        security: null,
        ...overrides,
    };
}

function operation(overrides: Partial<InteropOperation> = {}): InteropOperation {
    return {
        name: 'listaMascotas',
        channel: '/pets',
        direction: 'outgoing',
        security: [],
        http: http(),
        extras: {},
        ...overrides,
    };
}

describe('comparing the http side of two operations', () => {
    it('names the field that carries different content', () => {
        const left = documentOf({ operations: [operation({ http: http({ method: 'POST' }) })] });
        const right = documentOf({
            operations: [operation({ http: http({ path: '/pets/{id}' }) })],
        });

        expect(irDiff(left, right)).toEqual([
            'operations.listaMascotas.http.method',
            'operations.listaMascotas.http.path',
        ]);
    });

    it('reads the tags of an operation as a set', () => {
        const left = documentOf({ operations: [operation({ http: http({ tags: ['a', 'b'] }) })] });
        const right = documentOf({ operations: [operation({ http: http({ tags: ['b', 'a'] }) })] });

        expect(irDiff(left, right)).toEqual([]);
    });

    it('names the parameter and the response that differ, by the place and the status they speak', () => {
        const left = documentOf({
            operations: [
                operation({
                    http: http({
                        parameters: [
                            { name: 'limit', in: 'query', required: false, value: '10' },
                            { name: 'off', in: 'query', required: false, value: '0' },
                        ],
                        responses: [
                            {
                                name: '200',
                                status: '200',
                                contentType: 'application/json',
                                body: '[]',
                            },
                        ],
                    }),
                }),
            ],
        });
        const right = documentOf({
            operations: [
                operation({
                    http: http({
                        parameters: [
                            { name: 'limit', in: 'query', required: false, value: '25' },
                            { name: 'off', in: 'header', required: false, value: '0' },
                        ],
                        responses: [
                            {
                                name: '200',
                                status: '200',
                                contentType: 'application/json',
                                body: '{}',
                            },
                        ],
                    }),
                }),
            ],
        });

        expect(irDiff(left, right)).toEqual([
            'operations.listaMascotas.http.parameters.query:limit',
            'operations.listaMascotas.http.parameters.query:off',
            'operations.listaMascotas.http.parameters.header:off',
            'operations.listaMascotas.http.responses.200:application/json:200',
        ]);
    });

    it('names the response whose schema one side has changed', () => {
        const response = {
            name: 'lista',
            status: '200',
            contentType: 'application/json',
            body: '[]',
        };
        const left = documentOf({
            operations: [
                operation({
                    http: http({ responses: [{ ...response, schema: '{"type":"array"}' }] }),
                }),
            ],
        });
        const right = documentOf({
            operations: [
                operation({
                    http: http({ responses: [{ ...response, schema: '{"type":"object"}' }] }),
                }),
            ],
        });

        expect(irDiff(left, right)).toEqual([
            'operations.listaMascotas.http.responses.200:application/json:lista',
        ]);
    });

    it('tells a security that says nothing from one that asks for none', () => {
        const left = documentOf({ operations: [operation({ http: http({ security: null }) })] });
        const right = documentOf({ operations: [operation({ http: http({ security: [] }) })] });

        expect(irDiff(left, right)).toEqual(['operations.listaMascotas.http.security']);
    });

    it('names the http of an operation one side speaks and the other does not', () => {
        const withHttp = operation();
        const withoutHttp = operation({ http: undefined });

        expect(
            irDiff(
                documentOf({ operations: [withHttp] }),
                documentOf({ operations: [withoutHttp] }),
            ),
        ).toEqual(['operations.listaMascotas.http']);
    });
});
