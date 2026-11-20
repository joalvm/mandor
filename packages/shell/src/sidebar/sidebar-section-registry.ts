import { createDeclarations, type Declared } from '../declare/declarations.js';

/** What a section of the lateral decides: where it sits, its title and what folds with it. */
export type SidebarSectionLogic = {
    /** How many things the section holds, said after its title. */
    count?: number;
    /**
     * Whether the section takes the height the others leave. The rest are as tall as what they
     * hold, up to a cap; one section of the lateral fills, the one people keep the most in.
     */
    fills?: boolean;
    id: string;
    /**
     * What folding the section folds inside it, so closing a line closes everything under it: a
     * section that holds a tree closes the tree too. Called from its header and from the button
     * that folds every section.
     */
    onFold?: () => void;
    /** Where the section sits in the sidebar. The shell never learns the list by name. */
    order: number;
    /** A message key, translated on every draw, so the section retitles with the language. */
    title: string;
};

/**
 * What a section shows, declared as elements: `body` under its header, and `actions` beside its
 * title.
 */
type SidebarSectionPart = 'actions' | 'body';

type SidebarSectionSpec = Declared<SidebarSectionLogic, SidebarSectionPart>;

/** The registry `SidebarSection` and its parts write into. */
export const sidebarSectionDeclarations = createDeclarations<
    SidebarSectionLogic,
    SidebarSectionPart
>();

/** The declared sections, in the order each one asked for. */
export function sidebarSectionsInOrder(
    sections: readonly SidebarSectionSpec[],
): SidebarSectionSpec[] {
    return sections.toSorted((one, other) => one.order - other.order);
}
