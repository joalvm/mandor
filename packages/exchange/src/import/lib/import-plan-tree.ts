import type { IconName } from '@mandor/icons';
import type { Degradation, ImportPlan, ImportPlanEntry } from '@mandor/interop-core';
import { collectionItemMark, MESSAGE_ITEM_KIND, REQUEST_ITEM_KIND } from '@mandor/schema';

import { pickableIds, type ChoiceNode } from '../../choice/lib/choice-state.js';

/** The places that sit in the collections tree, where a route names its parent. */
const IN_TREE = new Set<ImportPlanEntry['place']>(['collection', 'folder', 'item']);

/** The places that hold others: a row can hang below them. */
const HOLDERS = new Set<ImportPlanEntry['place']>(['collection', 'folder']);

/** The glyph each place wears; an item wears its kind's, when it has one. */
const PLACE_ICONS: Record<ImportPlanEntry['place'], IconName> = {
    collection: 'collection',
    connection: 'connection',
    doc: 'doc',
    environment: 'environment',
    folder: 'folder',
    globals: 'globe',
    item: 'file',
    workspace: 'key',
};

// A Map, not an object: the kind is the document's text, and `constructor` must find no glyph.
const ITEM_ICONS: ReadonlyMap<string, IconName> = new Map([
    [REQUEST_ITEM_KIND, 'http'],
    [MESSAGE_ITEM_KIND, 'message'],
]);

function parentOf(route: string): string {
    return route.split('/').slice(0, -1).join('/');
}

/** The kind of the item an entry writes; no other place has one. */
function itemKindOf({ place, resource }: ImportPlanEntry): string | null {
    if (place !== 'item') {
        return null;
    }

    return resource?.itemKind ?? null;
}

function iconOf(entry: ImportPlanEntry): IconName {
    const kind = itemKindOf(entry);

    return (kind === null ? undefined : ITEM_ICONS.get(kind)) ?? PLACE_ICONS[entry.place];
}

/** The method of a request, read off the body the import would write; no other row wears one. */
function markOf(entry: ImportPlanEntry): string | undefined {
    const kind = itemKindOf(entry);

    if (entry.resource === null || kind === null) {
        return undefined;
    }

    return collectionItemMark({ body: entry.resource.fields, kind, name: entry.name, tags: [] });
}

/**
 * What the tree says: of the rows it keeps without a box, one phrase per class of entry, and of
 * what a document could not carry whole.
 */
type ImportWords = Record<'conflict' | 'removal', string> & {
    loss: (loss: Degradation) => string;
};

/**
 * Why a row cannot enter, when it cannot: the app keeps no place for it (`leftOut`), or the plan
 * has nothing to write for it (a conflict, a removal), which speaks in the words of its class.
 */
function reasonOf(entry: ImportPlanEntry, words: ImportWords): string | undefined {
    if (entry.leftOut !== undefined) {
        return words.loss(entry.leftOut);
    }

    if (entry.resource !== null) {
        return undefined;
    }

    if (entry.class === 'removal') {
        return words.removal;
    }

    return words.conflict;
}

/** What the format could not carry whole, as the resource itself tells it; the row still enters. */
function noteOf({ resource }: ImportPlanEntry, words: ImportWords): string | undefined {
    const lost = resource?.degradations ?? [];

    return lost.length === 0 ? undefined : lost.map(words.loss).join(' · ');
}

/**
 * The plan as the collections will look: the collection and the connections at the top, the
 * folders inside the collection, and every item under what it travels to. A conflict or a
 * removal is a row too — the tree shows what the document would touch. Each node is named by
 * where its entry sits in the plan and not by its route: a folder and a connection may share one,
 * and a name two rows answer to would mark both at once.
 */
export function importChoiceNodes(plan: ImportPlan, words: ImportWords): ChoiceNode[] {
    const byRoute = new Map<string, ChoiceNode>();
    const roots: ChoiceNode[] = [];

    plan.entries.forEach((entry, index) => {
        const holder = IN_TREE.has(entry.place) ? byRoute.get(parentOf(entry.route)) : undefined;
        const node: ChoiceNode = {
            children: [],
            icon: iconOf(entry),
            id: String(index),
            label: entry.name,
            mark: markOf(entry),
            note: noteOf(entry, words),
            open: entry.place === 'collection' || undefined,
            reason: reasonOf(entry, words),
        };

        if (HOLDERS.has(entry.place)) {
            byRoute.set(entry.route, node);
        }

        (holder?.children ?? roots).push(node);
    });

    return roots;
}

/** What the plan has marked, as the set the tree speaks in: its choosable leaves that are in. */
export function chosenOf(plan: ImportPlan, nodes: readonly ChoiceNode[]): Set<string> {
    const leaves = nodes.flatMap(pickableIds);

    return new Set(leaves.filter((id) => plan.entries[Number(id)]?.selected === true));
}

function marksOf(
    node: ChoiceNode,
    chosen: ReadonlySet<string>,
    marks: Map<number, boolean>,
): Map<number, boolean> {
    const leaves = pickableIds(node);

    node.children.forEach((child) => marksOf(child, chosen, marks));

    // A branch goes in with anything below it; one with nothing to choose keeps what it had.
    if (leaves.length > 0) {
        marks.set(
            Number(node.id),
            leaves.some((id) => chosen.has(id)),
        );
    }

    return marks;
}

/** The plan with its marks set to what was chosen; rows nobody can choose stay as they were. */
export function withChosen(
    plan: ImportPlan,
    nodes: readonly ChoiceNode[],
    chosen: ReadonlySet<string>,
): ImportPlan {
    const marks = new Map<number, boolean>();

    nodes.forEach((node) => marksOf(node, chosen, marks));

    return {
        ...plan,
        entries: plan.entries.map((entry, index) => ({
            ...entry,
            selected: marks.get(index) ?? entry.selected,
        })),
    };
}

/** The footer line: how many rows are marked, out of how many the document carries. */
export function selectionSummary(plan: ImportPlan): { selected: number; total: number } {
    return {
        selected: plan.entries.filter((entry) => entry.selected).length,
        total: plan.entries.length,
    };
}
