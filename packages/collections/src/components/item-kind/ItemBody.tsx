import type { PropsWithChildren } from 'react';

import { useItemPart } from './useItemPart.js';

type ItemBodyProps = PropsWithChildren;

/** The item open in its tab. It reads the item with `useItem`. */
export function ItemBody({ children }: ItemBodyProps) {
    useItemPart('body', children);

    return null;
}
