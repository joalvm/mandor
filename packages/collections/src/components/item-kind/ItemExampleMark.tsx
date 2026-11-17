import type { PropsWithChildren } from 'react';

import { useItemPart } from './useItemPart.js';

type ItemExampleMarkProps = PropsWithChildren;

/**
 * What an example of the item wears in its row and in its tab: its status code, in the hue of its
 * family. It reads the example with `useItem`, and the code the tree read off the file as `saved`.
 */
export function ItemExampleMark({ children }: ItemExampleMarkProps) {
    useItemPart('exampleMark', children);

    return null;
}
