import type { RequestLine } from '@mandor/schema';

/** One row of a table the way Insomnia and Bruno write it: a name, a value, and `disabled`. */
export type NamedRow = { name: string; value: string; disabled?: true };

/** The rows of a table of the request: a row half typed is not a row, and one switched off stays. */
export function namedRowsOf(lines: readonly RequestLine[]): NamedRow[] {
    return lines
        .filter((line) => line.key !== '')
        .map((line) => ({
            name: line.key,
            value: line.value,
            ...(line.enabled ? {} : { disabled: true as const }),
        }));
}
