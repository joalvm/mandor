import { describe, expect, it } from 'vitest';

import { claimStem } from '../../src/export/claim-stem.js';

describe('claimStem', () => {
    it('names a file after what it holds, in lowercase, and takes the name', () => {
        const taken: string[] = [];

        expect(claimStem('Lista de Mascotas', taken, 'request')).toBe('lista-de-mascotas');
        expect(taken).toEqual(['lista-de-mascotas']);
    });

    it('numbers the names that differ only by case, since a disk may not tell them apart', () => {
        const taken: string[] = [];

        expect([
            claimStem('Lista', taken, 'request'),
            claimStem('LISTA', taken, 'request'),
            claimStem('lista', taken, 'request'),
        ]).toEqual(['lista', 'lista-2', 'lista-3']);
    });

    it('keeps away from the names already taken in its directory', () => {
        const taken = ['folder'];

        expect(claimStem('Folder', taken, 'request')).toBe('folder-2');
    });

    it('takes the word of its kind for a name no file can keep', () => {
        const taken: string[] = [];

        expect(claimStem('???', taken, 'request')).toBe('request');
        expect(claimStem('', taken, 'request')).toBe('request-2');
    });
});
