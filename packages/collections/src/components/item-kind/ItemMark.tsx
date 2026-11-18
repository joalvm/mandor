import type { PropsWithChildren } from 'react';

import { useItemPart } from './useItemPart.js';

type ItemMarkProps = PropsWithChildren;

/**
 * What the item wears in place of its glyph, in its row and in its tab. It reads the item, and
 * the mark the tree read off its file, with `useItem`.
 */
export function ItemMark({ children }: ItemMarkProps) {
    useItemPart('mark', children);

    return null;
}
