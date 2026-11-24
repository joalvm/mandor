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
 * through a drag. A type the table drew is the table's: cleared there, it leaves the line.
 */
export function requestLinesOf(
    lines: readonly KeyValueLine[],
    previous: readonly RequestLine[],
): RequestLine[] {
    return lines.map((line) => {
        const before = withoutMeta(previous[Number(line.id)]);
        const meta = Object.hasOwn(line, 'meta') ? line.meta : previous[Number(line.id)]?.meta;

        return {
            ...before,
            ...(line.description === undefined ? {} : { description: line.description }),
            ...(meta === undefined ? {} : { meta }),
            enabled: !line.disabled,
            key: line.name,
            value: line.value,
        };
    });
}

/** A request line without the type it carried, which the table decides on. */
function withoutMeta(line: RequestLine | undefined): Partial<RequestLine> {
    if (line === undefined) {
        return {};
    }

    const rest: Partial<RequestLine> = { ...line };

    delete rest.meta;

    return rest;
}
