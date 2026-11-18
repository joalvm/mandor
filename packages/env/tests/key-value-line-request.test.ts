import type { RequestLine } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { keyValueLinesOf, requestLinesOf } from '../src/components/key-value/key-value-request.js';
import type { KeyValueLine } from '../src/components/key-value/key-value-line.js';

function line(
    id: string,
    name: string,
    value = '',
    extra: Partial<KeyValueLine> = {},
): KeyValueLine {
    return {
        disabled: false,
        id,
        name,
        value,
        ...extra,
    };
}

function requestLine(key: string, value: string, extra: Partial<RequestLine> = {}): RequestLine {
    return {
        enabled: true,
        key,
        value,
        ...extra,
    };
}

describe('the table and the request lines it is a view of', () => {
    it('draws the request lines as the table reads them', () => {
        const lines = keyValueLinesOf([
            requestLine('room', '1'),
            requestLine('draft', 'x', {
                description: 'sin uso',
                enabled: false,
                meta: { type: 'integer' },
            }),
        ]);

        expect(lines).toEqual([
            { disabled: false, id: '0', name: 'room', value: '1' },
            {
                description: 'sin uso',
                disabled: true,
                id: '1',
                meta: { type: 'integer' },
                name: 'draft',
                value: 'x',
            },
        ]);
    });

    it('writes the table back, with what the document gave the line travelling by identity', () => {
        const previous = [
            requestLine('room', '1', { required: true, schema: '{"type":"string"}' }),
            requestLine('page', '2'),
        ];
        const written = requestLinesOf(
            [
                line('0', 'room', '1', { description: 'la sala' }),
                line('1', 'page', '3'),
                line('4', 'token', 'abc', { meta: { required: true, type: 'string' } }),
            ],
            previous,
        );

        expect(written).toEqual([
            {
                description: 'la sala',
                enabled: true,
                key: 'room',
                required: true,
                schema: '{"type":"string"}',
                value: '1',
            },
            { enabled: true, key: 'page', value: '3' },
            { enabled: true, key: 'token', meta: { required: true, type: 'string' }, value: 'abc' },
        ]);
    });

    it('brings a switched-off line back as off, and drops nothing the table held', () => {
        const written = requestLinesOf(
            [line('0', 'draft', 'x', { description: 'vive apagada', disabled: true })],
            [requestLine('draft', 'x', { description: 'vive apagada' })],
        );

        expect(written).toEqual([
            { description: 'vive apagada', enabled: false, key: 'draft', value: 'x' },
        ]);
    });

    it('a line drawn by a plain list keeps the words and the type the list does not draw', () => {
        const before = [
            requestLine('page', '1', {
                description: 'The page to read',
                meta: { type: 'integer' },
            }),
        ];

        expect(requestLinesOf([line('0', 'page', '2')], before)).toEqual([
            requestLine('page', '2', {
                description: 'The page to read',
                meta: { type: 'integer' },
            }),
        ]);
    });

    it('a round trip gives back the lines it took, in the order they were written', () => {
        const lines = [
            requestLine('dryRun', 'true', { enabled: false }),
            requestLine('Content-Type', 'application/json'),
        ];

        expect(requestLinesOf(keyValueLinesOf(lines), lines)).toEqual(lines);
    });

    it('a line that says no description keeps the one the document gave it', () => {
        const written = requestLinesOf(
            [line('0', 'draft', 'x', { disabled: true })],
            [requestLine('draft', 'x', { description: 'vive apagada' })],
        );

        expect(written).toEqual([
            { description: 'vive apagada', enabled: false, key: 'draft', value: 'x' },
        ]);
    });
});
