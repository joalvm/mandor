import { useLanguage, useMessages } from '@mandor/i18n';
import { ArrowInboundIcon, ArrowOutboundIcon } from '@mandor/icons';
import { IconButton } from '@mandor/ui';
import { use, type PropsWithChildren } from 'react';

import type { ActivityEntry } from '../../activity-entry.js';
import { directionOf } from '../../activity-tally.js';
import { DockCloseContext } from '../../dock-close.js';
import { formatActivityTime } from '../../lib/format-activity-time.js';
import { formatByteSize } from '../../lib/format-byte-size.js';

const SIDE_OF_DIRECTION = {
    in: { Glyph: ArrowInboundIcon, label: 'directionIn' },
    out: { Glyph: ArrowOutboundIcon, label: 'directionOut' },
} as const;

type DockBandProps = PropsWithChildren<{
    entry: ActivityEntry;
}>;

/**
 * The band over the detail of an entry. It says of the entry what the row said — which way it
 * crossed, what it weighed, its moment — then carries what its detail does with it, and last
 * the way out of the dock. Each detail draws it, because what it can do with the entry is its own.
 */
export function DockBand({ children, entry }: DockBandProps) {
    const language = useLanguage();

    return (
        <div
            className="flex h-section shrink-0 items-center gap-gap-tight px-pad-panel"
            data-part="activity-dock-head"
        >
            <div
                className="me-auto flex min-w-0 items-center gap-gap-control text-xs tabular-nums"
                data-part="activity-dock-summary"
            >
                <DockDirection direction={directionOf(entry)} />
                <span className="flex min-w-0 items-center gap-gap-tight truncate text-text-secondary">
                    <span>{formatByteSize(entry.bytes, language)}</span>
                    <span aria-hidden="true" className="text-text-tertiary">
                        ·
                    </span>
                    <span>{formatActivityTime(entry.at, language)}</span>
                </span>
            </div>
            {children}
            <DockClose />
        </div>
    );
}

/** Which way the entry crossed, glyph and word; an entry that never crossed the wire says none. */
function DockDirection({ direction }: { direction: ReturnType<typeof directionOf> }) {
    const messages = useMessages('connections');

    if (direction === undefined) {
        return null;
    }

    const { Glyph, label } = SIDE_OF_DIRECTION[direction];

    return (
        <span className="flex shrink-0 items-center gap-gap-icon-text">
            <span aria-hidden="true" className="flex items-center text-text-tertiary">
                <Glyph size="sm" />
            </span>
            <span className="font-semibold text-text-primary">{messages(label)}</span>
        </span>
    );
}

function DockClose() {
    const messages = useMessages('connections');
    const close = use(DockCloseContext);

    if (close === null) {
        return null;
    }

    return <IconButton icon="close" label={messages('close')} onClick={close} size="sm" />;
}
