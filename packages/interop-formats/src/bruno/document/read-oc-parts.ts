import type { z } from 'zod';

import type { BrunoRow } from './bruno-tree.js';
import type { descriptionSchema, httpSchema } from './opencollection-schema.js';

type Row = NonNullable<z.output<typeof httpSchema>['headers']>[number];
type Param = NonNullable<z.output<typeof httpSchema>['params']>[number];

/** The text of a description or of a document, whichever of its two forms it was written in. */
export function descriptionTextOf(value: z.output<typeof descriptionSchema>): string {
    return typeof value === 'string' ? value : (value?.content ?? '');
}

/** The rows of a table of headers, as the tree lists them; a switched-off row stays. */
export function rowsOf(rows: readonly Row[] | null | undefined): BrunoRow[] {
    return (rows ?? []).map((row) => ({
        name: row.name ?? '',
        value: row.value ?? '',
        disabled: row.disabled === true,
    }));
}

/** The parameters of one kind: a parameter that says no kind is a query one. */
export function paramsOf(
    rows: readonly Param[] | null | undefined,
    type: 'query' | 'path',
): BrunoRow[] {
    return rowsOf((rows ?? []).filter((row) => (row.type ?? 'query') === type));
}
