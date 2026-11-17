import { ListRow, RowList, useRowWindow } from '@mandor/ui';
import { useRef } from 'react';

import type { ActivityEntry } from '../../activity-entry.js';
import { ActivityRow } from '../row/ActivityRow.js';

type ActivityLogProps = {
    entries: readonly ActivityEntry[];
    label: string;
    onSelect?: ((entryId: string) => void) | undefined;
    selectedId?: string | null | undefined;
};

/**
 * The bounded buffer of a resource as a timeline: only the rows on screen enter the DOM. It
 * holds entries, not messages: what each line looks like is the row of its kind to say, so
 * nothing here knows what a frame, a fault, or anything else in the timeline is made of.
 */
export function ActivityLog({ entries, label, onSelect, selectedId }: ActivityLogProps) {
    const viewport = useRef<HTMLDivElement>(null);
    // The timeline reads top-down into the past: what just arrived lands on top, where the user
    // already is, and scrolling is what reaches the history. The buffer stays chronological — the
    // order of the export and of what the dock opens never changes; this is only the view.
    const entryAt = (row: number): ActivityEntry | undefined => entries[entries.length - 1 - row];
    const view = useRowWindow({
        count: entries.length,
        keyOf: (row) => entryAt(row)?.id ?? row,
        scroller: () => viewport.current,
    });

    return (
        <div
            aria-label={label}
            className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto"
            data-part="activity-log"
            ref={viewport}
            role="log"
        >
            <div data-part="activity-viewport" data-total-size={`${String(view.total)}px`}>
                <RowList
                    count={entries.length}
                    data-offset={`${String(view.drawn[0]?.start ?? 0)}px`}
                    data-part="activity-window"
                    label={label}
                    scrollTo={view.scrollTo}
                >
                    {view.drawn.map(({ index, key }) => {
                        const entry = entryAt(index);

                        if (entry === undefined) {
                            return null;
                        }

                        if (onSelect === undefined) {
                            return <ActivityRow entry={entry} key={key} />;
                        }

                        const selected = entry.id === selectedId;

                        return (
                            <ListRow
                                density="line"
                                key={key}
                                onSelect={() => {
                                    onSelect(entry.id);
                                }}
                                selected={selected}
                            >
                                <ActivityRow entry={entry} />
                            </ListRow>
                        );
                    })}
                </RowList>
            </div>
        </div>
    );
}
