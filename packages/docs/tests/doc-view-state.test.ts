import { beforeEach, describe, expect, it } from 'vitest';

import type { DocViewState } from '../src/doc-view-state.js';
import { docsStore } from '../src/docs-store.js';
import {
    DOC_VIEW_UNTOLD,
    docModeOf,
    sideOfText,
    viewsWith,
    viewsWithout,
} from '../src/lib/doc-views.js';

beforeEach(() => {
    docsStore.getState().reset();
});

describe('which side of a doc a tab is showing', () => {
    /** Nobody has said anything, so the text says: something written is something to read. */
    it('reads a doc that has text and writes one that is empty', () => {
        expect(sideOfText('# Readme')).toBe('read');
        expect(sideOfText('')).toBe('write');
        expect(docModeOf(undefined, '# Readme')).toBe('read');
        expect(docModeOf(undefined, '')).toBe('write');
    });

    it('stops asking the text the moment the reader picks a side', () => {
        const told: DocViewState = { ...DOC_VIEW_UNTOLD, mode: 'read' };

        expect(docModeOf(told, '')).toBe('read');
        expect(docModeOf({ ...DOC_VIEW_UNTOLD, mode: 'write' }, '# Readme')).toBe('write');
    });

    it('opens one pane, with no page beside the markdown', () => {
        expect(DOC_VIEW_UNTOLD).toEqual({ mode: null, preview: false });
    });
});

describe('the view of one tab', () => {
    it('changes the part it was given and leaves the rest of the tab alone', () => {
        const views = viewsWith({ 'doc-1': { ...DOC_VIEW_UNTOLD, mode: 'write' } }, 'doc-1', {
            preview: true,
        });

        expect(views['doc-1']).toEqual({ mode: 'write', preview: true });
    });

    /** Opening the preview is not picking a side: an empty doc beside its page is still empty. */
    it('leaves the side unpicked when what changed was not the side', () => {
        const views = viewsWith({}, 'doc-1', { preview: true });

        expect(docModeOf(views['doc-1'], '')).toBe('write');
    });

    it('lets go of a tab, and hands back what it had for one it never knew', () => {
        const views = viewsWith({}, 'doc-1', { preview: true });

        expect(viewsWithout(views, 'doc-1')).toEqual({});
        expect(viewsWithout(views, 'doc-2')).toBe(views);
    });

    it('is released by the store when the window gives the tab back', () => {
        docsStore.getState().setView('doc-1', { preview: true });

        expect(docsStore.getState().views['doc-1']?.preview).toBe(true);

        docsStore.getState().releaseView('doc-1');

        expect(docsStore.getState().views).toEqual({});
    });
});

describe('the side a tab opened on', () => {
    it('is settled from the text the tab first saw', () => {
        docsStore.getState().settleSide('doc-1', '');
        docsStore.getState().settleSide('doc-2', '# Readme');

        expect(docsStore.getState().views['doc-1']?.mode).toBe('write');
        expect(docsStore.getState().views['doc-2']?.mode).toBe('read');
    });

    /** The first letter typed into an empty doc must not turn the tab into the page. */
    it('is not settled again by the text that was typed into it', () => {
        docsStore.getState().settleSide('doc-1', '');
        docsStore.getState().settleSide('doc-1', '# Readme');

        expect(docsStore.getState().views['doc-1']?.mode).toBe('write');
    });

    it('leaves the side the reader picked where it is', () => {
        docsStore.getState().setView('doc-1', { mode: 'read' });
        docsStore.getState().settleSide('doc-1', '');

        expect(docsStore.getState().views['doc-1']?.mode).toBe('read');
    });
});
