import { describe, expect, it } from 'vitest';

import { NameTakenError } from '../../src/collection/name-taken-error.js';

describe('the name taken error', () => {
    it('is an error that carries the path that was already taken', () => {
        const error = new NameTakenError('pedidos/ayer');

        expect(error).toBeInstanceOf(Error);
        expect(error.path).toBe('pedidos/ayer');
        expect(error.name).toBe('NameTakenError');
        expect(error.message).toContain('pedidos/ayer');
    });
});
