import { parseTree, type Node, type NodeType, type ParseError } from 'jsonc-parser';

/** A stretch of a text, `[from, to)`, as the editor underlines it. */
export type TextRange = { from: number; to: number };

/**
 * The value a key names inside one object of the document. A key written twice is read as the
 * parser reads it, the last one standing, so a refusal lands on the value that was checked.
 */
function childOfObject(children: readonly Node[], segment: string): Node | undefined {
    return children.findLast((property) => property.children?.[0]?.value === segment)
        ?.children?.[1];
}

/** The member an array ranks at the segment, read as a number. */
function childOfArray(children: readonly Node[], segment: string): Node | undefined {
    const index = Number(segment);

    return Number.isInteger(index) ? children[index] : undefined;
}

/** What answers a JSON Pointer segment: an object by its keys, an array by rank; nothing else. */
const CHILD_OF_TYPE: Partial<
    Record<NodeType, (children: readonly Node[], segment: string) => Node | undefined>
> = {
    object: childOfObject,
    array: childOfArray,
};

/** The child a JSON Pointer segment names, or nothing when the node holds none. */
function childOf(node: Node | undefined, segment: string): Node | undefined {
    if (node?.children === undefined) {
        return undefined;
    }

    return CHILD_OF_TYPE[node.type]?.(node.children, segment);
}

/** How far a JSON Pointer reaches into the document: the last node, and whether it got there. */
function walk(root: Node, path: string): { node: Node; whole: boolean } {
    const segments = path === '' ? [] : path.slice(1).split('/');
    let node = root;

    for (const raw of segments) {
        const child = childOf(node, raw.replace(/~1/g, '/').replace(/~0/g, '~'));

        if (child === undefined) {
            return { node, whole: false };
        }

        node = child;
    }

    return { node, whole: true };
}

/** The node a JSON Pointer names in the document, or nothing when the walk runs out of it. */
export function nodeAt(root: Node, path: string): Node | undefined {
    const reached = walk(root, path);

    return reached.whole ? reached.node : undefined;
}

function rangeOf(node: Node): TextRange {
    return { from: node.offset, to: node.offset + node.length };
}

/** Where a JSON Pointer lands, or the last value on its way when it runs out of document. */
export function closestRangeOf(root: Node, path: string): TextRange {
    return rangeOf(walk(root, path).node);
}

/**
 * Where a JSON Pointer lands in a JSONC text: the value it names, from its first character to
 * its last. A text the parser cannot read, or a pointer that leaves it, lands nowhere.
 */
export function rangeOfPointer(text: string, pointer: string): TextRange | undefined {
    const errors: ParseError[] = [];
    const root = parseTree(text, errors, { allowTrailingComma: true });
    const node = root === undefined || errors.length > 0 ? undefined : nodeAt(root, pointer);

    return node === undefined ? undefined : rangeOf(node);
}
