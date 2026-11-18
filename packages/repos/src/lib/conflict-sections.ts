import type { ConflictItem } from '@mandor/ipc';

import { pickOf, type ConflictChoices } from './conflict-drafts.js';

/** A part of the entity that clashes, named by the first step of the path of its questions. */
export type ConflictSection = {
    /** The step the questions share; empty when the whole file is one question. */
    key: string;
    blocks: SectionBlock[];
};

/** What a section draws as one piece: a single question, or the rows of one list as a table. */
type SectionBlock =
    { kind: 'single'; item: ConflictItem } | { kind: 'rows'; items: ConflictItem[] };

/** The list a row belongs to: its path without the row's own step. */
function listOf(item: ConflictItem): string {
    return item.path.slice(0, -1).join('/');
}

/** The block a question opens: a row starts a table, anything else stands alone. */
function blockOf(item: ConflictItem): SectionBlock {
    if (item.shape === 'row') {
        return { kind: 'rows', items: [item] };
    }

    return { kind: 'single', item };
}

/** Rows of one list that follow each other are one table; anything else stands alone. */
function blocksOf(items: readonly ConflictItem[]): SectionBlock[] {
    const blocks: SectionBlock[] = [];

    for (const item of items) {
        const last = blocks.at(-1);
        const joins =
            item.shape === 'row' &&
            last?.kind === 'rows' &&
            listOf(last.items[0] ?? item) === listOf(item);

        if (joins) {
            last.items.push(item);

            continue;
        }

        blocks.push(blockOf(item));
    }

    return blocks;
}

/** The questions of one block, in the order they came. */
function blockItems(block: SectionBlock): readonly ConflictItem[] {
    if (block.kind === 'rows') {
        return block.items;
    }

    return [block.item];
}

/**
 * The questions of a clash grouped by the part of the entity they belong to, in the order the
 * merge asked them. A section is only a way to read the list: it holds no answer of its own.
 */
export function sectionsOf(items: readonly ConflictItem[]): ConflictSection[] {
    const grouped = new Map<string, ConflictItem[]>();

    for (const item of items) {
        const key = item.path[0] ?? '';

        grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    return [...grouped].map(([key, each]) => ({ key, blocks: blocksOf(each) }));
}

/** Every question has an answer: the only thing «Resolver» waits for. */
export function allAnswered(
    items: readonly ConflictItem[],
    answered: (id: string) => boolean,
): boolean {
    return items.every((item) => answered(item.id));
}

/** Every question of a section, the rows of its lists in the order they came. */
export function itemsOf(section: ConflictSection): ConflictItem[] {
    return section.blocks.flatMap(blockItems);
}

/** What a question is called to the person: the last step of its path, without a row's index. */
export function itemName(item: ConflictItem): string {
    return (item.path.at(-1) ?? '').replace(/#\d+$/, '');
}

/**
 * Whether the questions have all taken `side` (`true`), only some (`'indeterminate'`) or none:
 * the state of the box that marks a whole side at once.
 */
export function sideState(
    items: readonly ConflictItem[],
    choices: ConflictChoices,
    side: 'ours' | 'theirs',
): boolean | 'indeterminate' {
    const taken = items.filter((item) => pickOf(choices[item.id]) === side).length;

    if (taken === 0) {
        return false;
    }

    return taken === items.length ? true : 'indeterminate';
}
