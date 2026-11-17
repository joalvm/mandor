import { translatorIn } from '@mandor/shell/testing/tab-kind';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    docPreviewTitle,
    docTabTitle,
    releaseDoc,
    subscribeDocTitles,
} from '../src/doc-tab-kinds.js';
import { docsStore } from '../src/docs-store.js';
import { rememberDocTop, rememberedDocTop } from '../src/lib/doc-scroll-memory.js';

const README = 'mandor://local-apis/events/doc/k3m9x2q7a4bd.md';

afterEach(() => {
    docsStore.getState().reset();
});

describe('what the shell asks of the tabs of a doc', () => {
    it('names the tab after the title of the doc, and the preview after the same title', () => {
        docsStore.getState().setDocs([{ name: 'k3m9x2q7a4bd.md', title: 'Léeme' }]);

        expect(docTabTitle(README)).toBe('Léeme');
        expect(docPreviewTitle(README, translatorIn())).toContain('Léeme');
        expect(docPreviewTitle(README, translatorIn())).not.toBe('Léeme');
    });

    /** The last segment of the resource is a file, and no file is drawn: the strip says it is untitled. */
    it('names nothing until the list of the workspace has landed', () => {
        expect(docTabTitle(README)).toBeNull();
        expect(docPreviewTitle(README, translatorIn())).toBeNull();
    });

    it('goes back to naming nothing when the workspace changes', () => {
        docsStore.getState().setDocs([{ name: 'k3m9x2q7a4bd.md', title: 'Léeme' }]);
        docsStore.getState().forgetDocs();

        expect(docTabTitle(README)).toBeNull();
    });

    /** The last segment of the resource is a file, and no file is drawn. */
    it('calls nameless a doc the list that landed does not hold', () => {
        docsStore.getState().setDocs([]);

        expect(docTabTitle(README)).toBe('');
        expect(docPreviewTitle(README, translatorIn())).not.toContain('k3m9x2q7a4bd');
    });

    it('tells the tabs to ask again when the list changes, and stops when they stop listening', () => {
        const changed = vi.fn();
        const stop = subscribeDocTitles(changed);

        docsStore.getState().setDocs([{ name: 'k3m9x2q7a4bd.md', title: 'Léeme' }]);
        stop();
        docsStore.getState().setDocs([]);

        expect(changed).toHaveBeenCalledTimes(1);
    });

    it('lets go of how the tab showed the file and of the text, on the way out', () => {
        docsStore.getState().setText(README, '# Readme\n');
        docsStore.getState().setView('doc-1', { mode: 'write' });
        rememberDocTop('doc-1', 120);

        releaseDoc('doc-1', README);

        expect(docsStore.getState().texts).toEqual({});
        expect(docsStore.getState().views).toEqual({});
        expect(rememberedDocTop('doc-1')).toBe(0);
    });
});
