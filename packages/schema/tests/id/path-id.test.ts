import { describe, expect, it } from 'vitest';

import { assertSegment, IdError, segmentsOf } from '../../src/index.js';

describe('assertSegment', () => {
    /** The segment is also a file name on three systems and a git key: no traversal, no case. */
    it.each([
        '..',
        'a/b',
        'a\b',
        '',
        '.git',
        '.hidden',
        'Api',
        'api pagos',
        'con',
        'com1',
        'Привет',
        '-日本',
        '日本!',
    ])('rejects "%s"', (value) => {
        expect(() => {
            assertSegment(value);
        }).toThrow(IdError);
    });

    it('carries the rejected value in the error', () => {
        expect(() => {
            assertSegment('..');
        }).toThrow(expect.objectContaining({ name: 'IdError', value: '..' }));
    });

    it.each(['api', 'api-pagos', 'a1', '0x', '日本-api', 'привет', 'がっこう'])(
        'accepts "%s"',
        (value) => {
            expect(() => {
                assertSegment(value);
            }).not.toThrow();
        },
    );

    it('rejects a segment longer than a portable file name', () => {
        expect(() => {
            assertSegment('a'.repeat(256));
        }).toThrow(IdError);
    });
});

describe('segmentsOf', () => {
    it('splits an id into its segments', () => {
        expect(segmentsOf('api-pagos/pedidos/crear')).toEqual(['api-pagos', 'pedidos', 'crear']);
    });

    it('rejects an id carrying an invalid segment', () => {
        expect(() => {
            segmentsOf('api-pagos/.git');
        }).toThrow(IdError);
    });
});
