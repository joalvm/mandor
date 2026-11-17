import { describe, expect, it } from 'vitest';

import { readDroppedFile } from '../../src/import/lib/read-dropped-file.js';

describe('readDroppedFile', () => {
    it('answers the path it was given and the text of what the user dropped', async () => {
        const file = new File(['asyncapi: 3.0.0'], 'pasarela.yaml', { type: 'text/yaml' });
        const dropped = await readDroppedFile(file, 'apis/pasarela.yaml');

        expect(dropped).toEqual({ path: 'apis/pasarela.yaml', text: 'asyncapi: 3.0.0' });
    });
});
