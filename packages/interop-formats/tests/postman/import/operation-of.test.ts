import { interopHttpOperationSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { operationOf } from '../../../src/postman/import/operation-of.js';

const place = { name: 'Users / Get', group: ['Users'] };

describe('operationOf', () => {
    it('maps method, url, parameters, group and the name of the request as summary', () => {
        const { operation, scheme } = operationOf(
            { name: 'Get', description: 'the item one' },
            {
                method: 'post',
                url: {
                    raw: '{{base}}/users/:id?v=1#h',
                    variable: [{ key: 'id', value: '7' }],
                    query: [{ key: 'v', value: '1' }],
                },
                header: [
                    { key: 'X-A', value: 'a', disabled: true },
                    { key: 'X-B' },
                    { key: null },
                    { key: ' ' },
                    {},
                ],
                description: 'the request one',
            },
            place,
        );

        expect(scheme).toBeUndefined();
        expect(operation).toMatchObject({
            name: 'Users / Get',
            channel: 'Users / Get',
            direction: 'outgoing',
            security: [],
            extras: { hash: 'h' },
        });
        expect(operation.http).toMatchObject({
            method: 'POST',
            url: '{{base}}/users/{id}',
            path: '',
            summary: 'Get',
            description: 'the item one',
            group: ['Users'],
            security: null,
            tags: [],
        });
        expect(
            operation.http?.parameters.map(({ name, in: where, enabled }) => [
                name,
                where,
                enabled,
            ]),
        ).toEqual([
            ['id', 'path', true],
            ['v', 'query', true],
            ['X-A', 'header', false],
            ['X-B', 'header', true],
        ]);
    });

    it('takes the description of the request when the item has none', () => {
        const { operation } = operationOf({}, { description: { content: 'mine' } }, place);

        expect(operation.http?.description).toBe('mine');
    });

    it('is a GET with no url, no group and no summary when the document says nothing', () => {
        const { operation } = operationOf({ name: null }, {}, { name: 'R', group: [] });

        expect(operation.http).toMatchObject({
            method: 'GET',
            summary: undefined,
            url: undefined,
            group: undefined,
        });
        expect(operationOf({}, { method: ' ' }, place).operation.http?.method).toBe('GET');
        expect(operationOf({}, { method: null }, place).operation.http?.method).toBe('GET');
    });

    it('carries its own auth as a scheme named after the operation, and none as an empty list', () => {
        const withScheme = operationOf(
            {},
            { auth: { type: 'bearer', bearer: [{ key: 'token', value: 't' }] } },
            place,
        );
        const none = operationOf({}, { auth: { type: 'noauth' } }, place);

        expect(withScheme.operation.http?.security).toEqual(['request:Users / Get']);
        expect(withScheme.scheme).toEqual({ type: 'bearer', extras: { token: 't' } });
        expect(none.operation.http?.security).toEqual([]);
        expect(none.scheme).toBeUndefined();
    });

    it('carries the body, what was lost of it, the examples and the scripts', () => {
        const { operation } = operationOf(
            {
                response: [{ name: 'ok', code: 200, body: '{}' }],
                event: [{ listen: 'test', script: { exec: ['a()'] } }],
            },
            { body: { mode: 'raw', raw: 'x', disabled: true } },
            place,
        );

        expect(operation.extras).toEqual({ lost: 'disabledBody' });
        expect(operation.http?.requestBody).toBeUndefined();
        expect(operation.http?.responses).toHaveLength(1);
        expect(operation.http?.scripts).toHaveLength(1);
    });

    it('keeps what neither the item nor the request consume, and drops what starts with an underscore', () => {
        const { operation } = operationOf(
            { id: 'i', protocolProfileBehavior: { followRedirects: false }, _x: 1 },
            { proxy: { host: 'p' }, certificate: {}, _y: 2 },
            place,
        );

        expect(operation.extras).toEqual({
            protocolProfileBehavior: { followRedirects: false },
            proxy: { host: 'p' },
            certificate: {},
        });
    });

    it('gives an http part the schema of the IR reads', () => {
        const { operation } = operationOf(
            { name: 'Get' },
            { url: { raw: '' }, body: { mode: 'raw' } },
            place,
        );

        expect(interopHttpOperationSchema.safeParse(operation.http).success).toBe(true);
    });
});
