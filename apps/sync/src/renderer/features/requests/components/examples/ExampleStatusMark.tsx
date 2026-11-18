import { useItem } from '@mandor/collections';
import type { ReactNode } from 'react';

import { exampleTone } from '../../lib/example-tone.js';

/**
 * The status an example answers with, where its line in the tree and its tab would wear a glyph.
 * The code is the one the tree read off the file, in the hue of how that answer ends.
 */
export function ExampleStatusMark(): ReactNode {
    const { saved } = useItem();

    return (
        <span
            className={`text-2xs font-semibold tabular-nums ${exampleTone(saved)}`}
            data-part="example-status-mark"
        >
            {saved ?? ''}
        </span>
    );
}
