import type { RequestLine } from '@mandor/schema';

import type { KeyValueLine } from './key-value-line.js';

/** The request lines as the table draws them: what the line was, plus what the columns add. */
export function keyValueLinesOf(lines: readonly RequestLine[]): KeyValueLine[] {
    return lines.map((line, index) => ({
        description: line.description,
        disabled: !line.enabled,
        id: String(index),
        meta: line.meta,
        name: line.key,
        value: line.value,
    }));
}

/**
 * The lines an editor leaves, back into request lines. A line half typed stays — it is what
 * the user sees while writing it — and the file only receives the named ones, which is what
 * the writer drops on its way out. Whatever a line carries that its editor does not draw — the
 * contract a document gave it, `schema` and `required`, and the words and type a plain list
 * leaves out — it keeps, found by the identity it was drawn under; the id travels with the row
 * through a drag.
 */
export function requestLinesOf(
    lines: readonly KeyValueLine[],
    previous: readonly RequestLine[],
): RequestLine[] {
    return lines.map((line) => ({
        ...previous[Number(line.id)],
        ...(line.description === undefined ? {} : { description: line.description }),
        ...(line.meta === undefined ? {} : { meta: line.meta }),
        enabled: !line.disabled,
        key: line.name,
        value: line.value,
    }));
}
