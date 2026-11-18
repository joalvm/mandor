import { compareValues } from './compare-values.js';

export type BodyComparison = {
    /** Values of the same type with other content, or a text that is not the one expected. */
    changes: number;
    differences: number;
    /** Whether both bodies were JSON and were walked key by key, or taken as plain text. */
    json: boolean;
};

type Parsed = { ok: true; value: unknown } | { ok: false };

function parsed(text: string): Parsed {
    try {
        return { ok: true, value: JSON.parse(text) as unknown };
    } catch {
        return { ok: false };
    }
}

/**
 * Sets the body an example expects against the one that came. Two JSON bodies are walked key by
 * key; anything else is taken as one text, which is equal or one change as a whole, since a text
 * has no keys and no types to set against.
 */
export function compareBodies(expected: string, received: string): BodyComparison {
    const left = parsed(expected);
    const right = parsed(received);

    if (left.ok && right.ok) {
        return { ...compareValues(left.value, right.value), json: true };
    }

    return { changes: expected === received ? 0 : 1, differences: 0, json: false };
}
