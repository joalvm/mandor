import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { binaryBodyOf, fileNameOf, fileRowOf } from '../../src/import/file-body-of.js';

describe('fileNameOf', () => {
    it('keeps the name alone, whichever separator the path used', () => {
        expect(fileNameOf('a/b/photo.png')).toBe('photo.png');
        expect(fileNameOf('C:\\data\\photo.png')).toBe('photo.png');
    });

    it('gives nothing for a name Mandor cannot keep in the repo', () => {
        expect(fileNameOf('')).toBe('');
        expect(fileNameOf('a/')).toBe('');
    });
});

const KEPT = degradation('pkceAlways');

describe('fileRowOf', () => {
    it('makes the field of a file and says it has to be copied', () => {
        const row = fileRowOf({ key: 'photo', source: 'a/photo.png', enabled: false }, [KEPT]);

        expect(row.field).toEqual({
            key: 'photo',
            value: 'photo.png',
            enabled: false,
            kind: 'file',
        });
        expect(row.degradations[0]).toEqual(KEPT);
        expect(row.degradations[1]).toEqual(
            degradation('fileFieldToCopy', { name: 'photo.png', key: 'photo' }),
        );
    });

    it('leaves the row out when the document named no file', () => {
        const row = fileRowOf({ key: 'photo', source: '', enabled: true }, []);

        expect(row.field).toBeUndefined();
        expect(row.degradations).toEqual([degradation('fileFieldWithoutFile', { key: 'photo' })]);
    });
});

describe('binaryBodyOf', () => {
    it('is a binary body by the name of the file, with the advice to copy it', () => {
        const mapping = binaryBodyOf('a/photo.png');

        expect(mapping.body).toEqual({ type: 'binary', file: 'photo.png' });
        expect(mapping.degradations[0]).toEqual(degradation('fileToCopy', { name: 'photo.png' }));
    });

    it('enters with no body when there is no file', () => {
        expect(binaryBodyOf('')).toEqual({
            body: { type: 'none' },
            degradations: [degradation('fileBodyWithoutFile')],
        });
    });
});
