import { cn } from '@mandor/ui';

import { scalarKindOf, scalarText, type JsonScalarKind } from './lib/json-tree.js';

type JsonValueProps = {
    value: unknown;
};

/** Text reads as text; what is not text says what it is by its colour, and `null` by a chip. */
const INK_OF_KIND: Readonly<Record<JsonScalarKind, string>> = {
    boolean: 'text-text-info',
    null: 'rounded-sm bg-surface-control px-1 text-text-secondary',
    number: 'text-text-info',
    string: 'text-text-primary',
};

/** A value of a JSON document that holds nothing else, the way the table shows it. */
export function JsonValue({ value }: JsonValueProps) {
    return (
        <span
            className={cn('min-w-0 break-all', INK_OF_KIND[scalarKindOf(value)])}
            data-part="json-value"
        >
            {scalarText(value)}
        </span>
    );
}
