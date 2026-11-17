import type { IconComponent } from '@mandor/icons';
import type { ErrorCode } from '@mandor/ipc';
import { createDeclarations, type Declared } from '@mandor/shell';

/**
 * What the app does with the response examples of an item. The tree draws them under the item;
 * only the app knows how to open one and how to write one, so each gesture of the tree lands here.
 */
export type ItemExamplesLogic = {
    /** Carries an example to another item of its kind, the one it was let go on. */
    move: (resource: string, targetItem: string) => Promise<void>;
    /** Puts the example in a tab, to the side of the one in view or in the focused group. */
    open: (resource: string, options: { beside: boolean; preview: boolean }) => void;
    rename: (resource: string, name: string) => Promise<void>;
    duplicate: (resource: string) => Promise<void>;
    /** Takes examples of one item out, all with one write. */
    remove: (resources: readonly string[]) => Promise<void>;
};

/** What a window decides about one kind of item: its glyph, its name, and where it opens. */
export type ItemKindLogic = {
    component: IconComponent;
    /**
     * Whether the item holds work its tab has not put on disk yet. Only a kind that waits to be
     * saved answers: one that writes as it is edited never holds any.
     */
    dirty?: ((resource: string) => boolean) | undefined;
    /** The examples of the item the tree draws under its row; a kind without any leaves it out. */
    examples?: ItemExamplesLogic | undefined;
    /** The kind of item, as the collection files it: `request`, `message`. */
    id: string;
    /**
     * Message key of the entry that makes one. The collection owns no name for a kind it never
     * heard of, so the menu says «New message» because whoever declared the kind said so.
     */
    newLabel: string;
    /**
     * Takes the item instead of its tab, and answers whether it took it. A connection that
     * composes an event asks for the event here; a window that has nobody to hand it to answers
     * false and the tab opens as always.
     */
    open?: ((resource: string) => boolean) | undefined;
    /**
     * Told when the last view of the item is gone, so the app lets go of what it loaded for it.
     * Opening it again reads it from disk.
     */
    release?: ((resource: string) => void) | undefined;
    /**
     * Puts the unsaved work of the item on disk, when its tab closes with some and the person
     * says to save it. Answers the code of the refusal, or nothing once it is saved.
     */
    save?: ((resource: string) => Promise<ErrorCode | null>) | undefined;
};

/**
 * What a kind of item shows, declared as elements that read the item with `useItem`:
 *
 * - `body`: the item open in its tab.
 * - `mark`: what it wears in place of its glyph, in its row and in its tab — the method of a
 *   request, in its hue.
 * - `status`: what its tab says about it in the slot the close takes — a draft nobody saved.
 * - `exampleMark`: what an example of the item wears in its row and in its tab — its status code.
 */
export type ItemPart = 'body' | 'exampleMark' | 'mark' | 'status';

export type ItemLeaf = Declared<ItemKindLogic, ItemPart>;

/** The registry `ItemKind` and its parts write into. */
export const itemKindDeclarations = createDeclarations<ItemKindLogic, ItemPart>();

/** Nothing, for a kind this window does not draw. That is a page saying so, never a crash. */
export function itemLeaf(kind: string | undefined): ItemLeaf | undefined {
    return kind === undefined ? undefined : itemKindDeclarations.get(kind);
}

/** Every kind this window can make, in the order each was first declared. */
export function itemLeaves(): readonly ItemLeaf[] {
    return itemKindDeclarations.list();
}
