import { documentRootOf } from '@mandor/interop-core';

import { InsomniaParseError } from './insomnia-parse-error.js';
import type { InsomniaDocument } from './insomnia-tree.js';
import { readV4 } from './read-v4.js';
import { readV5 } from './read-v5.js';
import { sniffInsomnia, type InsomniaVersion } from './sniff-insomnia.js';

/** How each layout is read: a layout added to the sniff must add its row here. */
const READERS: Record<InsomniaVersion, (root: unknown) => InsomniaDocument[]> = {
    4: readV4,
    5: readV5,
};

/**
 * Text to the collections it holds. The layout is told by what is inside, and a table picks the
 * reader: the two layouts end in the same tree, so nothing after this knows which one it was.
 */
export function parseInsomniaDocument(text: string): InsomniaDocument[] {
    const root = documentRootOf(text);

    if (root === null) {
        throw new InsomniaParseError(['The file is neither JSON nor YAML']);
    }

    return READERS[sniffInsomnia(root)](root);
}
