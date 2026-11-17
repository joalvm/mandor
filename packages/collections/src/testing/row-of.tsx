import type { PropsWithChildren } from 'react';

import {
    CollectionRowProvider,
    type CollectionRowContextValue,
} from '../collection-row-context.js';

export type { CollectionRowContextValue };

type RowOfProps = PropsWithChildren<{ row: CollectionRowContextValue }>;

/** Gives the lines an app declared into a menu the row they would be drawn for. */
export function RowOf({ children, row }: RowOfProps) {
    return <CollectionRowProvider value={row}>{children}</CollectionRowProvider>;
}
