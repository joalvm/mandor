import type { DocMode, DocViewState } from '../doc-view-state.js';

type Views = Readonly<Record<string, DocViewState>>;

/** A tab nobody has told anything: no side picked, and the markdown alone when it is written. */
export const DOC_VIEW_UNTOLD: DocViewState = { mode: null, preview: false };

/**
 * The side a doc of this text opens on. A doc with nothing in it has nothing to read, so it
 * opens where something can be put into it; a doc with something in it opens where it can be
 * read. It is the text of the moment the tab is opened and never a list kept elsewhere: a doc
 * written into yesterday is a doc with something in it today.
 */
export function sideOfText(text: string): DocMode {
    return text === '' ? 'write' : 'read';
}

/** Which side a tab is showing: what it was told, or what its text says while nobody has. */
export function docModeOf(view: DocViewState | undefined, text: string): DocMode {
    return view?.mode ?? sideOfText(text);
}

/** The same tab with the part the caller changed written over it, and the rest left alone. */
export function viewsWith(
    views: Views,
    tabId: string,
    patch: Partial<DocViewState>,
): Record<string, DocViewState> {
    return { ...views, [tabId]: { ...(views[tabId] ?? DOC_VIEW_UNTOLD), ...patch } };
}

/** The views without one tab. A tab that was never told anything leaves the map as it was. */
export function viewsWithout(views: Views, tabId: string): Record<string, DocViewState> {
    if (views[tabId] === undefined) {
        return views;
    }

    return Object.fromEntries(Object.entries(views).filter(([key]) => key !== tabId));
}
