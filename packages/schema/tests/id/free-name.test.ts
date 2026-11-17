import { describe, expect, it } from 'vitest';

import { freeName } from '../../src/id/free-name.js';

describe('the name a new thing is born with', () => {
    it('is the word itself while no sibling wears it', () => {
        expect(freeName('New request', ['Login'])).toBe('New request');
    });

    it('takes the first number nobody wears', () => {
        expect(freeName('New request', ['New request', 'New request 2'])).toBe('New request 3');
    });

    it('tells names apart regardless of case and spaces around them', () => {
        expect(freeName('New folder', [' new FOLDER '])).toBe('New folder 2');
    });
});
