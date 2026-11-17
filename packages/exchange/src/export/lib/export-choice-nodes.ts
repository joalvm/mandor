import type { IconName } from '@mandor/icons';
import type { OutlineKind, OutlineLoss, OutlineNode } from '@mandor/interop-core';

import type { ChoiceNode } from '../../choice/lib/choice-state.js';

/** The glyph each kind of node wears; an item wears the one of its kind. */
const KIND_ICONS: Record<OutlineKind, IconName> = {
    collection: 'collection',
    connection: 'connection',
    doc: 'doc',
    environment: 'environment',
    folder: 'folder',
    message: 'message',
    other: 'file',
    request: 'http',
    settings: 'braces',
    socketio: 'connection',
};

/**
 * The words the window says for the nodes whose label main cannot: a node of a kind named here
 * is called by it, and every other keeps the name it has in the workspace.
 */
export type ExportWords = Readonly<Partial<Record<OutlineKind, string>>>;

/**
 * The outline main sends, as the nodes the choice tree draws. The collections stand open: they
 * are what the user came to cut, and everything below them is one fold away.
 */
export function exportChoiceNodes(
    nodes: readonly OutlineNode[],
    words: ExportWords,
    lossWords: (loss: OutlineLoss) => string,
): ChoiceNode[] {
    return nodes.map((node) => ({
        children: exportChoiceNodes(node.children, words, lossWords),
        icon: KIND_ICONS[node.kind],
        id: node.id,
        label: words[node.kind] ?? node.label,
        mark: node.mark,
        note: node.unkept?.map(lossWords).join(' · '),
        open: node.kind === 'collection' || undefined,
        reason: node.reason ? lossWords(node.reason) : node.reason,
    }));
}
