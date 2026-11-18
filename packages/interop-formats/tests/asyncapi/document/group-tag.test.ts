import { describe, expect, it } from 'vitest';

import { domainOfTag, groupTagOf } from '../../../src/asyncapi/document/group-tag.js';

describe('the tag of a group', () => {
    it('is the plain name when nothing in it reads as a qualifier', () => {
        expect(groupTagOf('Pedidos')).toBe('Pedidos');
    });

    it('says outright that it names a group when the name has a colon', () => {
        expect(groupTagOf('a:b')).toBe('group:a:b');
        expect(domainOfTag('group:a:b')).toBe('a:b');
    });

    it('reads the three words that name a group, and nothing else', () => {
        expect(domainOfTag('domain:pagos')).toBe('pagos');
        expect(domainOfTag('Module:pagos')).toBe('pagos');
        expect(domainOfTag('source:pagos')).toBeUndefined();
        expect(domainOfTag('pagos')).toBeUndefined();
    });
});
