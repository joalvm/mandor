import type { InteropVariable } from '@mandor/interop-core';

import { textOf } from './text-of.js';

type Row = {
    key: string;
    value?: unknown;
    type?: string | null | undefined;
};

/** A variable row of a collection or an environment, as the document wrote it. */
export function variableOf(row: Row, enabled: boolean): InteropVariable {
    return {
        name: row.key,
        value: textOf(row.value),
        enabled,
        secret: row.type === 'secret',
    };
}
