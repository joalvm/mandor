import { type RefObject, useLayoutEffect, useMemo, useState } from 'react';

import type { KeyValueColumns } from './key-value-line.js';

/** Below this width three columns of text leave none of them legible. */
const STACK_BELOW = 560;

/** A box with no width laid out yet is not narrow: nothing has been measured. */
function isNarrow(box: HTMLElement): boolean {
    const { width } = box.getBoundingClientRect();

    return width > 0 && width < STACK_BELOW;
}

/**
 * Whether a narrow table keeps key and value as its columns and carries the description under
 * them, on a line of its own. The cell stays in the row, so the walk and the keys reach it as they
 * always did; only the tracks of the grid and the head lose it, which is what `gridColumns` says.
 */
export function useKeyValueStack(
    root: RefObject<HTMLElement | null>,
    columns: KeyValueColumns,
): { gridColumns: KeyValueColumns; stacked: boolean } {
    const [narrow, setNarrow] = useState(false);

    useLayoutEffect(() => {
        const box = root.current;

        if (box === null) {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            setNarrow(isNarrow(box));
        });

        // The observer answers once as soon as it starts: that is the first measure.
        observer.observe(box);

        return () => {
            observer.disconnect();
        };
    }, [root]);

    const stacked = narrow && columns.description && columns.value;
    const gridColumns = useMemo(
        () => (stacked ? { ...columns, description: false } : columns),
        [columns, stacked],
    );

    return { gridColumns, stacked };
}
