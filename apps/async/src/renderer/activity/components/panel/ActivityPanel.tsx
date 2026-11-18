import { useMessages } from '@mandor/i18n';
import type { ResourceUri } from '@mandor/schema';
import { IconButton, SplitHalf, SplitPane } from '@mandor/ui';
import { useMemo, useState } from 'react';

import type { ActivityEntry } from '../../activity-entry.js';
import { activityStore } from '../../activity-store.js';
import { directionOf } from '../../activity-tally.js';
import { useActivityStore } from '../../hooks/useActivityStore.js';
import { useSchemaOffenders } from '../../hooks/useSchemaOffenders.js';
import { selectNarrowingFor } from '../../select-narrowing-for.js';
import { narrowTimeline, RESTING_NARROWING } from '../../lib/timeline-narrowing.js';
import { formatActivityTime } from '../../lib/format-activity-time.js';
import { formatByteSize } from '../../lib/format-byte-size.js';
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
 * The share the user last set, for as long as the window lives: closing the dock keeps it,
 * closing the window throws it away. Session-wide, so two connection tabs argue about one dock
 * the same way they argue about the width of the sidebar.
 */
let dockShare = TIMELINE_SHARE;

type ActivityPanelProps = {
    entries: readonly ActivityEntry[];
    /** Clears what the timeline holds, where the entries come from. */
    onClear: () => void;
    /** Writes the timeline out of the app, where the user says. */
    onExport: () => void;
    /** The resource the timeline is filed under: the narrowing the head set lives beside it. */
    resource: ResourceUri;
    label: string;
    resizeLabel: string;
};

/**
 * The timeline of a resource, with the dock of the chosen entry under it. The dock exists only
 * while a line is marked: clicking one opens it, clicking it again closes it, and its own band
 * carries the way out for whoever never guesses the second click. What the dock draws is the
 * detail of the chosen entry, picked by its kind.
 */
export function ActivityPanel({
    entries,
    label,
    onClear,
    onExport,
    resource,
    resizeLabel,
}: ActivityPanelProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [split, setSplit] = useState(dockShare);
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
            <ActivityHead
                exportable={entries.length > 0}
                narrowing={narrowing}
                onClear={onClear}
                onNarrowingChange={(next) => {
                    activityStore.getState().setNarrowing(resource, next);
                }}
                onExport={onExport}
            />
            <ActivityBody
                entries={visible}
                label={label}
                onClose={() => {
                    setSelectedId(null);
                }}
                onSelect={onSelect}
                onSplitChange={onSplitChange}
                resizeLabel={resizeLabel}
                selected={selected}
                selectedId={selectedId}
                split={split}
            />
            <ActivityFoot entries={entries} hidden={hidden} onShowAll={onShowAll} />
        </div>
    );
}

type ActivityBodyProps = {
    entries: readonly ActivityEntry[];
    label: string;
    onClose: () => void;
    onSelect: (entryId: string) => void;
    onSplitChange: (next: number) => void;
    resizeLabel: string;
    selected: ActivityEntry | undefined;
    selectedId: string | null;
    split: number;
};

/**
 * The timeline alone while nothing is marked; split with the dock of the marked entry otherwise.
 * It is the same timeline either way: opening the dock beside it leaves it scrolled where the
 * reader was, and the line they pressed keeps the focus.
 */
function ActivityBody({
    entries,
    label,
    onClose,
    onSelect,
    onSplitChange,
    resizeLabel,
    selected,
    selectedId,
    split,
}: ActivityBodyProps) {
    return (
        <SplitPane
            className="min-h-0 flex-1"
            collapsed={selected === undefined}
            direction="column"
            label={resizeLabel}
            onValueChange={onSplitChange}
            value={split}
        >
            <SplitHalf>
                <ActivityLog
                    entries={entries}
                    label={label}
                    onSelect={onSelect}
                    selectedId={selectedId}
                />
            </SplitHalf>
            <DockHalf entry={selected} onClose={onClose} />
        </SplitPane>
    );
}

/** The half of the dock exists only while a line is marked. */
function DockHalf({ entry, onClose }: { entry: ActivityEntry | undefined; onClose: () => void }) {
    if (entry === undefined) {
        return null;
    }

    return (
        <SplitHalf>
            <ActivityDock entry={entry} onClose={onClose} />
        </SplitHalf>
    );
}

function ActivityDock({ entry, onClose }: { entry: ActivityEntry; onClose: () => void }) {
    const messages = useMessages('connections');

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col bg-surface-panel"
            data-part="activity-dock"
        >
            <div
                className="flex h-section shrink-0 items-center justify-between gap-gap-control px-pad-panel"
                data-part="activity-dock-head"
            >
                <div
                    className="flex min-w-0 items-center gap-gap-control text-xs tabular-nums"
                    data-part="activity-dock-summary"
                >
                    <DockDirection
                        direction={directionOf(entry)}
                        labels={{ in: messages('directionIn'), out: messages('directionOut') }}
                    />
                    <span>{formatByteSize(entry.bytes)}</span>
                    <span className="text-text-secondary">{formatActivityTime(entry.at)}</span>
                </div>
                <IconButton icon="close" label={messages('close')} onClick={onClose} />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
                <ActivityDetail entry={entry} />
            </div>
        </div>
    );
}

/** The band over the dock says of the entry what the row said: what crossed, its weight, its moment. */
function DockDirection({
    direction,
    labels,
}: {
    direction: ReturnType<typeof directionOf>;
    labels: Record<'in' | 'out', string>;
}) {
    if (direction === undefined) {
        return null;
    }

    return <span className="truncate">{labels[direction]}</span>;
}
