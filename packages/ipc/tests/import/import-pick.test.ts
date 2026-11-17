import { describe, expect, it } from 'vitest';

import { importPickedSchema, importPickRequestSchema } from '../../src/import/import-pick.js';
import { CHANNELS } from '../../src/index.js';

describe('the channel to pick a document', () => {
    it('is named once and reads as the wire knows it', () => {
        expect(CHANNELS.importPick).toBe('import:pick');
    });

    it('asks for a file, several files or a folder, and for nothing else', () => {
        for (const input of ['file', 'files', 'folder']) {
            expect(importPickRequestSchema.safeParse({ input }).success).toBe(true);
        }

        expect(importPickRequestSchema.safeParse({}).success).toBe(false);
        expect(importPickRequestSchema.safeParse({ input: 'disk' }).success).toBe(false);
        expect(importPickRequestSchema.safeParse({ input: 'file', text: 'x' }).success).toBe(false);
    });

    it('answers with the files, or with nothing when it was cancelled', () => {
        const files = [{ path: 'a.yaml', text: 'asyncapi' }];

        expect(importPickedSchema.safeParse({ files }).success).toBe(true);
        expect(importPickedSchema.safeParse({ files: null }).success).toBe(true);
        expect(importPickedSchema.safeParse({ files: [{ path: '', text: '' }] }).success).toBe(
            false,
        );
    });
});
