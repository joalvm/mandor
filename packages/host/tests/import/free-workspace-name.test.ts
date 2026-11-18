import { describe, expect, it } from 'vitest';

import { freeWorkspaceName } from '../../src/import/free-workspace-name.js';

describe('the name of a workspace an import makes', () => {
    it('is the one of the document when no workspace has it', () => {
        expect(freeWorkspaceName(['Otro'], 'Pasarela')).toBe('Pasarela');
    });

    it('takes the first number that is free when a workspace already has it', () => {
        expect(freeWorkspaceName(['Pasarela'], 'Pasarela')).toBe('Pasarela (2)');
        expect(freeWorkspaceName(['Pasarela', 'Pasarela (2)'], 'Pasarela')).toBe('Pasarela (3)');
    });

    it('does not mistake a numbered name for the plain one', () => {
        expect(freeWorkspaceName(['Pasarela (2)'], 'Pasarela')).toBe('Pasarela');
    });
});
