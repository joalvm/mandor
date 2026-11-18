import { Fragment, type ReactNode, useRef } from 'react';

import { useKeyValueTable } from './key-value-context.js';
import { KeyValueRow } from './KeyValueRow.js';
import { useKeyValueWindow } from './useKeyValueWindow.js';

type KeyValueGapProps = {
    size: number;
};

/**
 * The pairs of the table that are on screen, each after the height of the ones left out before
 * it, and the height of the ones after the last: the scrollbar reads the whole table.
 */
export function KeyValueLines(): ReactNode {
    const table = useKeyValueTable();
    const anchor = useRef<HTMLTableRowElement>(null);
    const view = useKeyValueWindow({
        anchor,
        dragId: table.dragId,
        lines: table.lines,
        reachedId: table.reachedId,
        rowsRef: table.rowsRef,
    });

    return (
        <>
            {view.lines.map((drawn) => (
                <Fragment key={drawn.key}>
                    <KeyValueGap size={drawn.gap} />
                    <KeyValueRow index={drawn.index} line={drawn.line} measure={view.measure} />
                </Fragment>
            ))}
            <tr
                aria-hidden="true"
                data-part="key-value-gap"
                data-size={`${String(Math.max(view.tail, 0))}px`}
                ref={anchor}
            />
        </>
    );
}

/** The pairs left out, as tall as they would stand; nothing left out, nothing drawn. */
function KeyValueGap({ size }: KeyValueGapProps): ReactNode {
    if (size <= 0) {
        return null;
    }

    return <tr aria-hidden="true" data-part="key-value-gap" data-size={`${String(size)}px`} />;
}
