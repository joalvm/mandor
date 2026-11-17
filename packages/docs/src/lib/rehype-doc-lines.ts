import type { Element, Nodes, RootContent } from 'hast';

/**
 * Writes on every block of the drawn page the line of markdown it was written from, so the two
 * halves of a split can be pointed at the same place in a document nobody can hold in one
 * screen. It says nothing about how far down the page a block ended up: that is measured on the
 * page itself, once, when the scroll is being matched.
 *
 * It runs after the tree has been filtered, which is why the filter does not have to be told
 * about the attribute: what the doc wrote can never carry it, because nothing of the doc
 * reaches this point as an element in the first place.
 *
 * Only the blocks of the top level are marked. A line of a nested list is a place too, but a
 * document is scrolled by its paragraphs and its headings, and an anchor every few words would
 * be a map at the scale of the thing it maps.
 */
export function rehypeDocLines() {
    return (tree: Nodes): void => {
        if (tree.type !== 'root') {
            return;
        }

        tree.children.forEach(markLine);
    };
}

function markLine(node: RootContent): void {
    const line = node.position?.start.line;

    if (node.type !== 'element' || line === undefined) {
        return;
    }

    const element: Element = node;

    element.properties['dataLine'] = line;
}
