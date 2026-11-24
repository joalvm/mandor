import { useRef } from 'react';

import { useOpenKeys } from '../../hooks/useOpenKeys.js';
import { useRowWindow } from '../../hooks/useRowWindow.js';
import type { ConsoleEntry } from './console-entry.js';
import { ConsoleEntryRow } from './ConsoleEntryRow.js';

type ConsoleEntriesProps = {
    /** What the list says while nothing was written. */
    empty: string;
    entries: readonly ConsoleEntry[];
    label: string;
    /** Each entry starts with the time it was written. */
    showTimestamps: boolean;
};

/**
 * The entries of a console, one under the other in the order they were written, following the
 * last one as a browser console does. A long one stays light: only the entries on screen enter
 * the DOM, and what is open stays open while it scrolls out of sight and back.
 */
export function ConsoleEntries({ empty, entries, label, showTimestamps }: ConsoleEntriesProps) {
    const viewport = useRef<HTMLDivElement>(null);
    const { open, toggle } = useOpenKeys();
    const view = useRowWindow({
        count: entries.length,
        followsEnd: true,
        keyOf: (index) => entries[index]?.key ?? index,
        scroller: () => viewport.current,
    });

    if (entries.length === 0) {
        return (
            <p
                className="p-pad-panel text-sm text-text-secondary"
                data-part="console-entries-empty"
            >
                {empty}
            </p>
        );
    }

    return (
        <div
            className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto"
            data-part="console-entries"
            ref={viewport}
        >
            <div data-part="console-entries-viewport" data-total-size={`${String(view.total)}px`}>
                <ul
                    aria-label={label}
                    data-offset={`${String(view.drawn[0]?.start ?? 0)}px`}
                    data-part="console-entries-window"
                >
                    {view.drawn.map(({ index, key }) => (
                        <EntryAt
                            entry={entries[index]}
                            index={index}
                            key={key}
                            measure={view.measure}
                            onToggle={toggle}
                            open={open}
                            showTimestamps={showTimestamps}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
}

type EntryAtProps = {
    entry: ConsoleEntry | undefined;
    index: number;
    measure: (node: Element | null) => void;
    onToggle: (key: string) => void;
    open: ReadonlySet<string>;
    showTimestamps: boolean;
};

function EntryAt({ entry, ...props }: EntryAtProps) {
    if (entry === undefined) {
        return null;
    }

    return <ConsoleEntryRow entry={entry} {...props} />;
}
