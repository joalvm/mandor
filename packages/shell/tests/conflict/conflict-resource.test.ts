import { describe, expect, it } from 'vitest';

import {
    conflictIdOf,
    conflictResource,
    conflictTabId,
} from '../../src/conflict/conflict-resource.js';

describe('where a clash lives (conflict-resource)', () => {
    it('names the clash by its id, under the workspace and the origin', () => {
        expect(conflictResource('Mi Equipo', 'payments', '3fa94c01d27b8e65')).toBe(
            'mandor://mi-equipo/payments/conflict/3fa94c01d27b8e65',
        );
    });

    it('reads the id back out of the resource', () => {
        const resource = conflictResource('demo', 'payments', '3fa94c01d27b8e65');

        expect(conflictIdOf(resource)).toBe('3fa94c01d27b8e65');
    });

    it('finds no clash in the resource of anything else', () => {
        expect(conflictIdOf('mandor://demo/payments/doc/guia.md')).toBe('');
        expect(conflictIdOf('mandor://_app/origins')).toBe('');
    });

    it('gives each clash a tab of its own', () => {
        expect(conflictTabId('3fa94c01d27b8e65')).toBe('conflict:3fa94c01d27b8e65');
    });
});
