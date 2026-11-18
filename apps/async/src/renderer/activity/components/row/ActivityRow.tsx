import type { ReactNode } from 'react';

import { pickByKind, type ActivityEntry, type ByEntryKind } from '../../activity-entry.js';
import { ConnectionFaultRow } from './ConnectionFaultRow.js';
import { ConnectionMessageRow } from './ConnectionMessageRow.js';
import { ConnectionScriptRow } from './ConnectionScriptRow.js';
import { ConnectionStatusRow } from './ConnectionStatusRow.js';

const ROW_OF_KIND: ByEntryKind<ReactNode> = {
    'connection-message': (entry) => <ConnectionMessageRow entry={entry} />,
    'connection-fault': (entry) => <ConnectionFaultRow entry={entry} />,
    'connection-status': (entry) => <ConnectionStatusRow entry={entry} />,
    'connection-script': (entry) => <ConnectionScriptRow entry={entry} />,
};

type ActivityRowProps = {
    entry: ActivityEntry;
};

/** The line of the timeline an entry draws, chosen by its kind. */
export function ActivityRow({ entry }: ActivityRowProps) {
    return pickByKind(ROW_OF_KIND, entry);
}
