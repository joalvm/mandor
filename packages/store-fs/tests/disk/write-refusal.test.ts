import { describe, expect, it } from 'vitest';

import { NameTakenError } from '../../src/index.js';
import { writeRefusal } from '../../src/disk/write-refusal.js';

describe('the error a refused create travels as', () => {
    it('turns a name already on disk into the error the collection also raises', () => {
        const refusal = writeRefusal({ code: 'EEXIST' }, 'notas.md');

        expect(refusal).toBeInstanceOf(NameTakenError);
        expect(String(refusal)).toContain('notas.md');
    });

    /** A disk that is full or refuses the write is not the author choosing a name badly. */
    it('lets anything else up as it came', () => {
        const full = { code: 'ENOSPC' };

        expect(writeRefusal(full, 'notas.md')).toBe(full);
    });

    /** Nothing says what is thrown is an object with a code, so nothing may be read off it. */
    it('lets up what does not even carry a code', () => {
        const odd = new Error('roto');

        expect(writeRefusal('roto', 'notas.md')).toBe('roto');
        expect(writeRefusal(null, 'notas.md')).toBeNull();
        expect(writeRefusal(odd, 'notas.md')).toBe(odd);
    });
});
