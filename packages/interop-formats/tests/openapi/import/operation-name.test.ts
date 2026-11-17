import { describe, expect, it } from 'vitest';

import { operationName } from '../../../src/openapi/import/operation-name.js';

const WHERE = { method: 'GET', path: '/pets' };

describe('what an operation is called', () => {
    it('prefers the summary, then the operation id, then the method and the path', () => {
        expect(
            operationName({ summary: 'List pets', operationId: 'listPets' }, WHERE, new Set()),
        ).toBe('List pets');
        expect(operationName({ operationId: 'listPets' }, WHERE, new Set())).toBe('listPets');
        expect(operationName({}, WHERE, new Set())).toBe('GET /pets');
    });

    it('moves on to the next candidate when the name is taken, and takes it', () => {
        const taken = new Set<string>();

        expect(operationName({ summary: 'Pets', operationId: 'a' }, WHERE, taken)).toBe('Pets');
        expect(operationName({ summary: 'Pets', operationId: 'b' }, WHERE, taken)).toBe('b');
        expect(operationName({ summary: 'Pets', operationId: 'b' }, WHERE, taken)).toBe(
            'GET /pets',
        );
        expect(taken).toEqual(new Set(['Pets', 'b', 'GET /pets']));
    });
});
