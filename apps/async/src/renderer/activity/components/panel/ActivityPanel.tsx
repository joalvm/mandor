import { useMessages } from '@mandor/i18n';
import { usePaneLayout, type PaneLayout } from '@mandor/shell';
import type { ResourceUri } from '@mandor/schema';
import { Card, SplitHalf, SplitPane } from '@mandor/ui';
import { useMemo, useState, type PropsWithChildren } from 'react';

import type { ActivityEntry } from '../../activity-entry.js';
import { activityStore } from '../../activity-store.js';
import { DockCloseContext } from '../../dock-close.js';
import { useActivityStore } from '../../hooks/useActivityStore.js';
import { useSchemaOffenders } from '../../hooks/useSchemaOffenders.js';
import { selectNarrowingFor } from '../../select-narrowing-for.js';
import { narrowTimeline, RESTING_NARROWING } from '../../lib/timeline-narrowing.js';
import { ActivityDetail } from '../dock/ActivityDetail.js';

import { ActivityFoot } from './ActivityFoot.js';
import { ActivityHead } from './ActivityHead.js';
import { ActivityLog } from './ActivityLog.js';

/**
 * The dock is 208px of a panel that stands some six hundred tall, so the timeline keeps the
 * rest of it to begin with.
 */
const TIMELINE_SHARE = 65;

/**
 * The dock stands across the way the message and the activity stand: under the activity while
 * they are side by side, beside it once they are one over the other, so each keeps its room.
 */
const DOCK_DIRECTION = {
    horizontal: 'row',
    vertical: 'column',
} as const satisfies Record<PaneLayout, 'column' | 'row'>;

/**
 * The share the user last set, for as long as the window lives: closing the dock keeps it,
 * closing the window throws it away. Session-wide, so two connection tabs argue about one dock
 * the same way they argue about the width of the sidebar.
 */
let dockShare = TIMELINE_SHARE;

type ActivityPanelProps = PropsWithChildren<{
    entries: readonly ActivityEntry[];
    /** Clears what the timeline holds, where the entries come from. */
    onClear: () => void;
    /** Writes the timeline out of the app, where the user says. */
    onExport: () => void;
    /** The resource the timeline is filed under: the narrowing the head set lives beside it. */
    resource: ResourceUri;
    label: string;
    resizeLabel: string;
}>;

/**
 * The timeline of a resource in its card, with the dock of the chosen entry in a card of its own
 * under it, the gutter between them. The dock exists only while a line is marked: clicking one
 * opens it, clicking it again closes it, and its own band carries the way out for whoever never
 * guesses the second click. What the dock draws is the detail of the chosen entry, picked by its
 * kind.
 */
export function ActivityPanel({
    children,
    entries,
    label,
    onClear,
    onExport,
    resource,
    resizeLabel,
}: ActivityPanelProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [split, setSplit] = useState(dockShare);
    const layout = usePaneLayout();
    const narrowing = useActivityStore(selectNarrowingFor(resource));
    const offenders = useSchemaOffenders(entries, narrowing.schemaOnly);
    const selected = entries.find((entry) => entry.id === selectedId);
    // The foot counts what the connection moved, the timeline draws what the head leaves it:
    // one narrowing never rewrites the other.
    const visible = useMemo(
        () => narrowTimeline(entries, narrowing, offenders),
        [entries, narrowing, offenders],
    );
    const hidden = entries.length - visible.length;

    /** Clicking the open entry closes it: the timeline is where the selection is made and unmade. */
    function onSelect(entryId: string): void {
        setSelectedId((current) => (current === entryId ? null : entryId));
    }

    /** The dock remembers its share past its own closing, so reopening lands where it left. */
    function onSplitChange(next: number): void {
        dockShare = next;
        setSplit(next);
    }

    /** Lifting the filter is putting the head back at rest: a view never touched the buffer. */
    function onShowAll(): void {
        activityStore.getState().setNarrowing(resource, { ...RESTING_NARROWING });
    }

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="activity-panel">
            <SplitPane
                className="min-h-0 flex-1"
                collapsed={selected === undefined}
                direction={DOCK_DIRECTION[layout]}
                gap="gutter"
                label={resizeLabel}
                onValueChange={onSplitChange}
                value={split}
            >
                <SplitHalf>
                    <Card aria-label={label}>
                        <ActivityHead
                            entries={entries}
                            narrowing={narrowing}
                            onClear={onClear}
                            onNarrowingChange={(next) => {
                                activityStore.getState().setNarrowing(resource, next);
                            }}
                            onExport={onExport}
                        >
                            {children}
                        </ActivityHead>
                        <div className="min-h-0 flex-1" data-part="activity-body">
                            <ActivityLog
                                entries={visible}
                                label={label}
                                onSelect={onSelect}
                                selectedId={selectedId}
                            />
                        </div>
                        <ActivityFoot hidden={hidden} onShowAll={onShowAll} />
                    </Card>
                </SplitHalf>
                <DockHalf
                    entry={selected}
                    onClose={() => {
                        setSelectedId(null);
                    }}
                />
            </SplitPane>
        </div>
    );
}

/**
 * The half of the dock exists only while a line is marked. It is a card apart from the timeline,
 * and every detail draws its band over itself: the way out reaches the band from here.
 */
function DockHalf({ entry, onClose }: { entry: ActivityEntry | undefined; onClose: () => void }) {
    const messages = useMessages('connections');

    if (entry === undefined) {
        return null;
    }

    return (
        <SplitHalf>
            <Card aria-label={messages('activityDetail')}>
                <DockCloseContext value={onClose}>
                    <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="activity-dock">
                        <ActivityDetail entry={entry} />
                    </div>
                </DockCloseContext>
            </Card>
        </SplitHalf>
    );
}
