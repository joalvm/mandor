import type { PropsWithChildren } from 'react';

import { useItemPart } from './useItemPart.js';

type ItemStatusProps = PropsWithChildren;

/**
 * What the tab of the item says about it in the slot the close takes. It reads the item with
 * `useItem`.
 */
export function ItemStatus({ children }: ItemStatusProps) {
    useItemPart('status', children);

    return null;
}
