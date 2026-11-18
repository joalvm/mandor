import { createDeclarations, type Declared } from '../declare/declarations.js';
import { SidebarSearchTakenError } from './sidebar-search-taken-error.js';

/**
 * The searcher of the sidebar. A field of text is not a section: it does not fold, it has no
 * title, and it stands above the lists in the header the sidebar keeps for it. What matches and
 * what opens belongs to whoever declares it; the sidebar only knows where to draw it.
 */
export type SidebarSearchLogic = {
    id: string;
    /** The shortest query that takes the body: who declares says its number. */
    minimumQuery: number;
    /** Who answers for it, so a second declaration can name the two sides of the clash. */
    owner: string;
};

/**
 * What the searcher shows, declared as elements: `field` in the header of the bar, which reaches
 * the box it stands in with `useSidebarSearchField`, and `results`, drawn over the sections while
 * the query asks for them.
 */
type SidebarSearchPart = 'field' | 'results';

export type SidebarSearchSpec = Declared<SidebarSearchLogic, SidebarSearchPart>;

/** The one id the searcher goes by: a window has one header, so it has one searcher. */
export const SIDEBAR_SEARCH_ID = 'sidebar-search';

/** The registry `SidebarSearch` and its parts write into. */
export const sidebarSearchDeclarations = createDeclarations<
    SidebarSearchLogic,
    SidebarSearchPart
>();

let focus: (() => void) | undefined;

/**
 * Declares the searcher and returns its cleanup. One owner at a time: a second one is a clash
 * of two features over one header, and it says who the two are.
 */
export function declareSidebarSearch(logic: SidebarSearchLogic): () => void {
    const held = sidebarSearchDeclarations.get(SIDEBAR_SEARCH_ID);

    if (held !== undefined && held.owner !== logic.owner) {
        throw new SidebarSearchTakenError(held.owner, logic.owner);
    }

    return sidebarSearchDeclarations.declare(logic);
}

/**
 * The sidebar holds the ref of the field, so it is the one that knows how to reach it. It hands
 * the way in here, and the surface of the search calls — no query over the DOM, no frame to wait
 * for: the field never unmounts.
 */
export function holdSidebarSearchFocus(next: (() => void) | undefined): void {
    focus = next;
}

/** Puts the caret in the field of the header, while the sidebar has one mounted. */
export function focusSidebarSearch(): void {
    focus?.();
}
