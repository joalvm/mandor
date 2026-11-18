import { failure, success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { docResource } from '../src/lib/doc-resource.js';
import { docsStore } from '../src/docs-store.js';
import { loadDocText } from '../src/lib/load-doc-text.js';

const NOTAS = docResource('local', 'events', 'notas.md');

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
});

describe('bringing the text of a doc into the window', () => {
    it('keeps what the file holds', async () => {
        vi.spyOn(bridge.doc, 'read').mockResolvedValue(success('# Notas'));

        await loadDocText(NOTAS);

        expect(docsStore.getState().texts[NOTAS]).toBe('# Notas');
    });

    /** A tab that waits for a text that will never come would stay blank without a word. */
    it('says why the file could not be read, and reads it again when asked again', async () => {
        const read = vi
            .spyOn(bridge.doc, 'read')
            .mockResolvedValueOnce(failure('fs-read', 'EACCES'))
            .mockResolvedValueOnce(success('# Notas'));

        await loadDocText(NOTAS);

        expect(docsStore.getState().error).toBe('fs-read');
        expect(docsStore.getState().texts[NOTAS]).toBeUndefined();

        await loadDocText(NOTAS);

        expect(read).toHaveBeenCalledTimes(2);
        expect(docsStore.getState().texts[NOTAS]).toBe('# Notas');
    });
});
