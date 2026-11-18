import { describe, expect, it } from 'vitest';

import type { ResourceIndex } from '../../src/resource/resource-index.js';
import { openSections, sectionKey } from '../../src/sidebar/open-sections.js';

const RESOURCES: ResourceIndex = {
    'mandor://one': { missing: false, tabs: ['a'] },
};

describe('where the section of a resource is kept', () => {
    it('is the resource itself when it has one strip', () => {
        expect(sectionKey('mandor://one', undefined)).toBe('mandor://one');
    });

    it('is the resource and the strip, after a space no address holds', () => {
        expect(sectionKey('mandor://one', 'headers')).toBe('mandor://one headers');
    });
});

describe('the sections of the resources that are still open', () => {
    it('keeps the section of an open resource and that of a strip inside it', () => {
        const sections = { 'mandor://one': 'body', 'mandor://one headers': 'raw' };

        expect(openSections(sections, RESOURCES)).toEqual(sections);
    });

    it('drops what belongs to a resource nobody is looking at any more', () => {
        const sections = {
            'mandor://gone': 'body',
            'mandor://gone headers': 'raw',
            'mandor://one': 'body',
        };

        expect(openSections(sections, RESOURCES)).toEqual({ 'mandor://one': 'body' });
    });

    it('keeps nothing when no resource is open', () => {
        expect(openSections({ 'mandor://one': 'body' }, {})).toEqual({});
    });
});
