import { describe, expect, it } from 'vitest';

import {
    exampleTint,
    exampleTone,
} from '../../../../src/renderer/features/requests/lib/example-tone.js';

describe('the colour of the code of an example', () => {
    it('is green for a success and red for either kind of refusal', () => {
        expect(exampleTone('201')).toBe('text-text-success');
        expect(exampleTone('404')).toBe('text-text-error');
        expect(exampleTone('503')).toBe('text-text-error');
    });

    it('is the quiet one for a code that is not a number a status can be', () => {
        expect(exampleTone('default')).toBe('text-text-tertiary');
        expect(exampleTone('2XX')).toBe('text-text-tertiary');
        expect(exampleTone('99')).toBe('text-text-tertiary');
        expect(exampleTone(undefined)).toBe('text-text-tertiary');
    });
});

describe('the ground of the pill that carries the code of an example', () => {
    it('is the tint of the family of the code', () => {
        expect(exampleTint('201')).toBe('bg-surface-success-tint');
        expect(exampleTint('404')).toBe('bg-surface-error-tint');
    });

    it('is the plain ground for a code that is not a number a status can be', () => {
        expect(exampleTint('default')).toBe('bg-surface-control');
        expect(exampleTint(undefined)).toBe('bg-surface-control');
    });
});
