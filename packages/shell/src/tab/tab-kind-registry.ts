import type { Translator } from '@mandor/i18n';
import type { ErrorCode } from '@mandor/ipc';
import type { IconName } from '@mandor/ui';
import type { ReactNode } from 'react';

import { createDeclarations } from '../declare/declarations.js';
import type { Tab } from './tab.js';

/**
 * What a save answers: nothing once the work is on disk, the code of the refusal, or `kept` when
 * the person chose, while saving, to keep the tab after all — a save that first asks where.
 */
export type TabSaveOutcome = ErrorCode | 'kept' | null;

/** What a kind decides: the window asks it, and nothing here is drawn. */
export type TabKindLogic = {
    /**
     * Asked before a tab of this kind leaves by the user's hand — the strip, the menu, a
     * shortcut, closing its group. The kind answers whether it may go: false keeps the tab open,
     * and it is the kind's to say why. What closes a tab because its thing is gone does not ask.
     */
    beforeClose?: ((tabId: string) => Promise<boolean>) | undefined;
    closable: boolean;
    /**
     * Whether the tab holds work that is not on disk yet. Only a kind that waits to be saved
     * answers: one that writes as it is typed is never dirty, and goes with the saved. Closing a
     * dirty tab by hand asks first whether to save it, let it go, or keep the tab open.
     */
    dirty?: ((tabId: string, resource: Tab['resource']) => boolean) | undefined;
    /**
     * Whether the workspace still holds the thing of this kind a link names, asked before the
     * link opens a tab that would be blank. Documents and items are the core's to answer; a kind
     * an app adds answers for its own things, and a kind nobody declared holds nothing.
     */
    holds?: ((workspaceId: string, path: string) => Promise<boolean>) | undefined;
    icon: IconName;
    id: string;
    /**
     * Lets go of whatever the tab was holding while it was open: a live socket, the buffer of
     * what arrived through it. Called as the tab leaves the window, and never about disk — what
     * the tab was a view of stays exactly where it was, ready to be opened again. The resource
     * comes along with the id, because what was held is filed under the thing, not under the view.
     */
    release?: ((tabId: string, resource: Tab['resource']) => void) | undefined;
    /**
     * False for a kind whose thing lives only while its tab is open: once the tab leaves, what it
     * held is let go, and reopening it would bring back a tab with nothing in it.
     */
    reopenable?: boolean | undefined;
    /**
     * The section of the lateral that lists the thing of the tab: where «Show in the sidebar»
     * takes it. A kind no section lists is never offered there.
     */
    section?: string | undefined;
    /**
     * Says when the titles of this kind stopped being what they were, so a drawn tab reads its
     * own again. A kind whose title is spelled out by the resource never needs it; one that
     * looks the name up somewhere else does, because nothing else tells the tab it moved.
     */
    subscribeTitles?: ((onChange: () => void) => () => void) | undefined;
    /**
     * Puts the unsaved work of the tab on disk, for the question a dirty tab asks as it closes.
     * Answers the code of the refusal, `kept` when the person stayed while saving, or nothing once
     * it is saved. A dirty kind without it is only offered to let the work go or to stay.
     */
    save?: ((tabId: string, resource: Tab['resource']) => Promise<TabSaveOutcome>) | undefined;
    /**
     * Read off the resource on every draw, so a renamed file retitles its tabs by itself. A kind
     * whose title is a word of the interface says it with `translate`, in the language of the
     * window: a translator of its own would speak the default one. `null` is a name still on
     * its way: the tab draws nothing for that moment instead of calling the thing nameless.
     */
    title: (resource: Tab['resource'], translate: Translator) => string | null;
    /**
     * The names of what holds the thing of the tab, outermost first: the collection and the
     * folders an item hangs from. Said by name and never by path, since the tooltip of the tab
     * tells two tabs of one name apart with it. A kind whose thing hangs from nothing leaves it out.
     */
    trail?: ((resource: Tab['resource']) => string[]) | undefined;
};

/**
 * What a kind shows, declared as elements. Each one reads its tab with `useTab`, so the same
 * element serves every tab of the kind.
 */
type TabKindParts = {
    /** What the group shows while the tab is in front. */
    body?: ReactNode;
    /** Drawn before the title: the mark of what the tab holds. */
    indicator?: ReactNode;
    /**
     * What the tab says about its thing while nobody points at it: the live state of a socket,
     * and nothing at all for a document. It sits at the end of the tab, in the slot the close
     * takes, so a tab never grows a place for it.
     */
    status?: ReactNode;
};

export type TabPart = keyof TabKindParts;

export type TabKindSpec = TabKindLogic & TabKindParts;

const KINDS = createDeclarations<TabKindLogic, TabPart>();

/** The registry `TabKind` and its parts write into; read through the functions below. */
export const tabKindDeclarations = KINDS;

/**
 * Declares what a kind decides and returns its cleanup. The `TabKind` component calls it; a
 * kind declared twice under one id is the last one, and the cleanup of the first undoes nothing.
 */
export function declareTabKind(logic: TabKindLogic): () => void {
    return KINDS.declare(logic);
}

/** Declares one drawn part of a kind and returns its cleanup, under the same rule. */
export function declareTabPart(id: string, part: TabPart, node: ReactNode): () => void {
    return KINDS.declarePart(id, part, node);
}

/** The kind, or nothing, for whoever is asking about a tab that may not be drawn yet. */
export function tabKind(id: string): TabKindSpec | undefined {
    return KINDS.get(id);
}

export function tabKindOf(id: string): TabKindSpec {
    const kind = tabKind(id);

    if (kind === undefined) {
        throw new Error(`Tab kind is not declared: ${id}`);
    }

    return kind;
}
