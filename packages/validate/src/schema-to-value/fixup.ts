import RandExp from 'randexp';

/** A regex that draws nothing: it looks ahead or behind, and no inversion of it is attempted. */
const LOOKAROUND = /\(\?[<!=]/;

/**
 * What the standard allows and the engine mangles, said before generating. Two fixes, both the
 * standard's own words: a `pattern` the engine would answer with letters where digits go is
 * answered here — a value that meets it, drawn by `randexp` with the same seed the generation
 * carries — and the tuple form of `items` (draft-07) is written the way the engine reads it
 * (`prefixItems`, 2020-12), generating nothing past what the tuple names.
 *
 * The walk is over data, the way every walk in this package is: the schema arrives parsed, so
 * whatever nests inside (`properties`, `anyOf`, `$defs`…) is reached the same way.
 */
export function fixedForGeneration(schema: unknown, rng: () => number): unknown {
    return fixed(schema, rng);
}

function fixed(node: unknown, rng: () => number): unknown {
    if (Array.isArray(node)) {
        return node.map((entry) => fixed(entry, rng));
    }

    if (typeof node !== 'object' || node === null) {
        return node;
    }

    // Defined, not assigned: a key `__proto__` stays a key instead of becoming a prototype.
    const written: Record<string, unknown> = Object.fromEntries(
        Object.entries(node).map(([key, value]) => [key, fixed(value, rng)]),
    );

    if (typeof written['pattern'] === 'string' && drawsNothing(written, written['pattern'])) {
        const drawn = drawnValue(written['pattern'], rng);

        if (drawn === undefined) {
            // A pattern that is no regex at all says nothing any engine can draw: it goes, and
            // the type it sits on answers.
            delete written['pattern'];
        } else {
            written['const'] = drawn;
        }
    }

    if (Array.isArray(written['items'])) {
        written['prefixItems'] = written['items'];
        written['items'] = written['additionalItems'] ?? false;
    }

    return written;
}

/** A `pattern` is answered only where nothing more specific already says what the value is. */
function drawsNothing(written: Record<string, unknown>, pattern: string): boolean {
    return (
        written['const'] === undefined && written['enum'] === undefined && !LOOKAROUND.test(pattern)
    );
}

function drawnValue(pattern: string, rng: () => number): string | undefined {
    try {
        const drawn = new RandExp(pattern);

        drawn.randInt = (from, to) => from + Math.floor(rng() * (to - from + 1));

        return drawn.gen();
    } catch {
        return undefined;
    }
}
