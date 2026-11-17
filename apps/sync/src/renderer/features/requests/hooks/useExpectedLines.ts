import type { KeyValueLine } from '@mandor/env';
import { useState } from 'react';

import { linesOfPairs, pairsOfLines, samePairs, type ExpectedPair } from '../lib/expected-lines.js';

/**
 * The lines of the table of what an example declares. The table holds lines and the example is
 * written from them: while one is being typed it may have no name yet, so the lines are the truth
 * and the example trails them. When the example moves by another hand, the lines follow it.
 */
export function useExpectedLines(
    pairs: readonly ExpectedPair[],
    onWrite: (pairs: readonly ExpectedPair[]) => void,
) {
    const [editing, setEditing] = useState(() => ({ lines: linesOfPairs(pairs), sent: pairs }));

    if (!samePairs(editing.sent, pairs)) {
        setEditing({ lines: linesOfPairs(pairs), sent: pairs });
    }

    function onLinesChange(next: readonly KeyValueLine[]): void {
        const written = pairsOfLines(next);

        setEditing({ lines: [...next], sent: written });

        if (!samePairs(written, pairs)) {
            onWrite(written);
        }
    }

    return { lines: editing.lines, onLinesChange };
}
