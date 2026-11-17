import { describe, expect, it } from 'vitest';

import { documentSourceId } from '../../../src/bruno/document/document-source-id.js';

describe('documentSourceId', () => {
    it('tells a collection by its name, without case or margins', () => {
        expect(documentSourceId('  Tienda de Mascotas ')).toBe(
            documentSourceId('tienda de mascotas'),
        );
    });

    it('tells a renamed collection from the old one', () => {
        expect(documentSourceId('Tienda')).not.toBe(documentSourceId('Tienda 2'));
    });

    it('writes it as a collection id the origin can keep', () => {
        expect(documentSourceId('Tienda')).toMatch(/^collection:[0-9a-f]{64}$/u);
    });
});
