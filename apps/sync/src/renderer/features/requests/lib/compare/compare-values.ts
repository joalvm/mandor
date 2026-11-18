export type Compared = {
    /** Values of the same type with other content, which the example may take but need not. */
    changes: number;
    /** Keys that came or went, and values that changed type: the shape the example promises. */
    differences: number;
};

const NONE: Compared = { changes: 0, differences: 0 };

/** What stands for a value that is not on one of the sides. */
const MISSING = Symbol('missing');

type Shape = 'array' | 'leaf' | 'missing' | 'object';

function shapeOf(value: unknown): Shape {
    if (value === MISSING) {
        return 'missing';
    }

    if (Array.isArray(value)) {
        return 'array';
    }

    return value !== null && typeof value === 'object' ? 'object' : 'leaf';
}

function entriesOf(value: unknown): [string, unknown][] {
    if (Array.isArray(value)) {
        return value.map((each, at) => [String(at), each as unknown]);
    }

    return Object.entries(value as Record<string, unknown>);
}

function pick(side: Map<string, unknown>, key: string): unknown {
    return side.has(key) ? side.get(key) : MISSING;
}

/** The type of a scalar the way JSON tells them apart: `null` is its own. */
function typeOfLeaf(value: unknown): string {
    return value === null ? 'null' : typeof value;
}

function leafWalk(expected: unknown, received: unknown): Compared {
    if (Object.is(expected, received)) {
        return NONE;
    }

    const sameType = typeOfLeaf(expected) === typeOfLeaf(received);

    return sameType ? { changes: 1, differences: 0 } : { changes: 0, differences: 1 };
}

function containerWalk(expected: unknown, received: unknown): Compared {
    const left = new Map(entriesOf(expected));
    const right = new Map(entriesOf(received));
    const keys = [...left.keys(), ...[...right.keys()].filter((key) => !left.has(key))];
    const inside = keys.map((key) => walk(pick(left, key), pick(right, key)));

    return {
        changes: inside.reduce((sum, each) => sum + each.changes, 0),
        differences: inside.reduce((sum, each) => sum + each.differences, 0),
    };
}

const WALKERS: Record<Shape, (expected: unknown, received: unknown) => Compared> = {
    array: containerWalk,
    leaf: leafWalk,
    missing: () => NONE,
    object: containerWalk,
};

/** One value of each side, walked: the two of a shape go the way their shape does, else it differs. */
function walk(expected: unknown, received: unknown): Compared {
    const shape = shapeOf(expected);

    if (shape !== shapeOf(received)) {
        return { changes: 0, differences: 1 };
    }

    return WALKERS[shape](expected, received);
}

/**
 * Walks the value an example expects and the one that came, key by key. What counts as a
 * difference is the shape: the keys and the type of each value. Other content of the same type is
 * kept apart as a change.
 */
export function compareValues(expected: unknown, received: unknown): Compared {
    return walk(expected, received);
}
