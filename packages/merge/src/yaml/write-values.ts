import { isScalar, Scalar, visit, type Document, type Node } from 'yaml';

import { isObject, ownValue } from '../value/plain-object.js';
import { sameValue } from '../value/same-value.js';

type Path = readonly string[];

/** A text with line breaks is a block, so it reads as the lines it is and merges as lines. */
function shapeScalar(scalar: Scalar): void {
    if (typeof scalar.value === 'string' && scalar.value.includes('\n')) {
        scalar.type = Scalar.BLOCK_LITERAL;
    }
}

function nodeOf(document: Document, value: unknown): Node {
    const node = document.createNode(value);

    visit(node, {
        Scalar: (_key, scalar) => {
            shapeScalar(scalar);
        },
    });

    return node;
}

/** A scalar that stays a scalar keeps its node, so the comment written next to it survives. */
function scalarAt(document: Document, path: Path, next: unknown): Scalar | undefined {
    const target = document.getIn(path, true);
    const isPlain = typeof next !== 'object' || next === null;

    return isScalar(target) && isPlain ? target : undefined;
}

function writeAt(document: Document, path: Path, current: unknown, next: unknown): void {
    if (sameValue(current, next)) {
        return;
    }

    if (isObject(current) && isObject(next)) {
        writeObject(document, path, current, next);

        return;
    }

    if (path.length === 0) {
        document.contents = document.createNode(next);

        return;
    }

    const scalar = scalarAt(document, path, next);

    if (scalar === undefined) {
        document.setIn(path, nodeOf(document, next));

        return;
    }

    scalar.value = next;
    shapeScalar(scalar);
}

function writeObject(
    document: Document,
    path: Path,
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): void {
    for (const key of Object.keys(current)) {
        if (!Object.hasOwn(next, key)) {
            document.deleteIn([...path, key]);
        }
    }

    for (const [key, value] of Object.entries(next)) {
        writeAt(document, [...path, key], ownValue(current, key), value);
    }
}

/**
 * Brings the document to the merged value by touching only what changed, so the comments, the
 * order and the style of everything else survive. A list that changed is replaced whole: the
 * comments inside it go, which is the price of not guessing which row each comment belonged to.
 */
export function writeValues(document: Document, next: unknown): void {
    writeAt(document, [], document.toJS(), next);
}
