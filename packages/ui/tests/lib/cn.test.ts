import { describe, expect, it } from 'vitest';

import { cn } from '../../src/lib/cn.js';

describe('combining classes', () => {
    it('joins what is given and drops what is not a class', () => {
        expect(cn('flex', false, undefined, null, ['gap-2'], { 'p-1': true, 'p-2': false })).toBe(
            'flex gap-2 p-1',
        );
    });

    it('lets the later class of a conflict win', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
        expect(cn('text-sm', 'text-xs')).toBe('text-xs');
    });

    it('lets a caller replace a height of the scale with another one', () => {
        expect(cn('h-control', 'h-row')).toBe('h-row');
        expect(cn('h-tab', 'h-field')).toBe('h-field');
    });

    it('lets a caller replace a pad of the scale with another one', () => {
        expect(cn('px-pad-control', 'px-pad-panel')).toBe('px-pad-panel');
        expect(cn('ps-pad-control', 'ps-pad-panel')).toBe('ps-pad-panel');
        expect(cn('pe-pad-control', 'pe-pad-panel')).toBe('pe-pad-panel');
    });

    it('keeps classes that do not take each other place', () => {
        expect(cn('h-control', 'px-pad-control')).toBe('h-control px-pad-control');
    });
});
