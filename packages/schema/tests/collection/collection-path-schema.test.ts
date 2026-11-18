import { describe, expect, it } from 'vitest';

import {
    collectionParentSchema,
    collectionPathSchema,
} from '../../src/collection/collection-path-schema.js';

describe('collectionPathSchema', () => {
    it.each(['pedidos', 'pedidos/abril', 'pedidos/abril/crear'])('accepts %s', (path) => {
        expect(collectionPathSchema.parse(path)).toBe(path);
    });

    it.each(['', '/pedidos', 'pedidos/', 'a//b', '../fuera', 'a/./b', 'Pedidos', 'a\\b', 'con'])(
        'refuses %j',
        (path) => {
            expect(collectionPathSchema.safeParse(path).success).toBe(false);
        },
    );

    it('refuses what is not text', () => {
        expect(collectionPathSchema.safeParse(null).success).toBe(false);
    });
});

describe('collectionParentSchema', () => {
    it('accepts the empty string as the top level, which has no path of its own', () => {
        expect(collectionParentSchema.parse('')).toBe('');
    });

    it('accepts a folder path', () => {
        expect(collectionParentSchema.parse('pedidos/abril')).toBe('pedidos/abril');
    });

    it('refuses a path that traverses', () => {
        expect(collectionParentSchema.safeParse('pedidos/../x').success).toBe(false);
    });
});
