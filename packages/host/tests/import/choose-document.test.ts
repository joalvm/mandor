import { describe, expect, it } from 'vitest';

import type { ChooseDocument } from '../../src/import/choose-document.js';

describe('ChooseDocument', () => {
    it('answers the paths picked or nothing, and never throws the caller a curve', async () => {
        const picked: ChooseDocument = () => Promise.resolve(['/tmp/a.yaml', '/tmp/b.yaml']);
        const cancelled: ChooseDocument = () => Promise.resolve(null);

        await expect(picked('files')).resolves.toEqual(['/tmp/a.yaml', '/tmp/b.yaml']);
        await expect(cancelled('file')).resolves.toBeNull();
    });
});
