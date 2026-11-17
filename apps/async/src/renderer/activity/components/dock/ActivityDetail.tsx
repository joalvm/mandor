import type { ReactNode } from 'react';

import { pickByKind, type ActivityEntry, type ByEntryKind } from '../../activity-entry.js';
import { ConnectionFaultDetail } from './ConnectionFaultDetail.js';
import { ConnectionMessageDetail } from './ConnectionMessageDetail.js';
import { ConnectionScriptDetail } from './ConnectionScriptDetail.js';
import { ConnectionStatusDetail } from './ConnectionStatusDetail.js';

const DETAIL_OF_KIND: ByEntryKind<ReactNode> = {
    'connection-message': (entry) => <ConnectionMessageDetail entry={entry} />,
    'connection-fault': (entry) => <ConnectionFaultDetail entry={entry} />,
    'connection-status': (entry) => <ConnectionStatusDetail entry={entry} />,
    'connection-script': (entry) => <ConnectionScriptDetail entry={entry} />,
};

type ActivityDetailProps = {
    entry: ActivityEntry;
};

/** What the dock opens for the chosen entry, chosen by its kind. */
export function ActivityDetail({ entry }: ActivityDetailProps) {
    return pickByKind(DETAIL_OF_KIND, entry);
}
