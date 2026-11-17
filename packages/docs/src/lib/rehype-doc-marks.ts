import type { Element, Nodes } from 'hast';

/** The five alerts of GitHub, spelt the way a doc writes them on the first line of a quote. */
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n)?/;

function walk(node: Nodes, visit: (element: Element) => void): void {
    if (node.type === 'element') {
        visit(node);
    }

    if ('children' in node) {
        node.children.forEach((child) => {
            walk(child, visit);
        });
    }
}

/**
 * A quote whose first line is `[!NOTE]` is an alert of GitHub: the mark comes off the text and
 * its kind goes on the quote. A paragraph that held nothing but the mark goes with it.
 */
function markAlert(quote: Element): void {
    const paragraph = quote.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'p',
    );
    const first = paragraph?.children[0];

    if (paragraph === undefined || first?.type !== 'text') {
        return;
    }

    const kind = ALERT.exec(first.value)?.[1];

    if (kind === undefined) {
        return;
    }

    first.value = first.value.replace(ALERT, '');
    quote.properties['dataAlert'] = kind.toLowerCase();

    if (paragraph.children.every((child) => child.type === 'text' && child.value.trim() === '')) {
        quote.children = quote.children.filter((child) => child !== paragraph);
    }
}

/** Where the walk is in the doc: the place the next task box takes. */
type Marking = { task: number };

/** A task box takes its place in the doc, so ticking it on the page ticks the right box of the text. */
function markTask(input: Element, marking: Marking): void {
    if (input.properties.type !== 'checkbox') {
        return;
    }

    input.properties['dataTask'] = marking.task;
    marking.task += 1;
}

/** What each element is marked with, by its tag; any other element carries no mark. */
const MARK_OF_TAG: ReadonlyMap<string, (element: Element, marking: Marking) => void> = new Map([
    ['blockquote', markAlert],
    ['input', markTask],
]);

/**
 * The marks the page of a doc draws by: the kind of each alert, and the place of each task in
 * the doc, so ticking one on the page ticks the right box of the text.
 *
 * It runs after the filter, which is why the filter does not have to be told about either: what
 * a doc writes can never carry them, because nothing of the doc reaches this point as an
 * attribute it chose.
 */
export function rehypeDocMarks() {
    return (tree: Nodes): void => {
        const marking: Marking = { task: 0 };

        walk(tree, (element) => {
            MARK_OF_TAG.get(element.tagName)?.(element, marking);
        });
    };
}
