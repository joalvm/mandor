import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';
import { use } from 'react';

import type { ConnectionFault, ConnectionFaultEntry } from '../../activity-entry.js';
import { FaultActionsContext } from '../../fault-actions.js';
import { DockBand } from './DockBand.js';

type ConnectionFaultDetailProps = {
    entry: ConnectionFaultEntry;
};

/**
 * The failure read whole, in the same dock as any other line of the timeline. It has a code, a moment
 * and the words of the transport: a network error is something that happened, so it is shown the way
 * the frames around it are shown, and it can be copied out of here like them. Its moment is the
 * band's to say — the dock says it the same way it says a frame's. A script that kept the socket
 * shut leaves the way past it here: the row stays a line to select.
 */
export function ConnectionFaultDetail({ entry }: ConnectionFaultDetailProps) {
    const errorMessages = useMessages('errors');
    const fault = entry.detail;

    return (
        <>
            <DockBand entry={entry} />
            <div
                className="flex min-h-0 flex-1 flex-col gap-gap-group overflow-auto px-pad-panel py-pad-control"
                data-format="text"
                data-part="activity-detail"
            >
                <p className="text-sm text-text-error">{errorMessages(fault.code)}</p>
                <FaultMessage message={fault.message} />
                <ConnectWithoutScripts fault={fault} />
            </div>
        </>
    );
}

/** What the transport said, word for word, to be read and copied as it came. */
function FaultMessage({ message }: { message: string | undefined }) {
    if (message === undefined || message === '') {
        return null;
    }

    return (
        <p className="font-mono text-code break-all whitespace-pre-wrap text-text-primary select-text">
            {message}
        </p>
    );
}

/** Only a broken script has a way past it, and only inside the connection it broke. */
function ConnectWithoutScripts({ fault }: { fault: ConnectionFault }) {
    const labels = useMessages('connections');
    const actions = use(FaultActionsContext);

    if (fault.code !== 'script-failed' || actions === null) {
        return null;
    }

    return (
        <p className="flex items-center">
            <Button onClick={actions.connectWithoutScripts} size="sm">
                {labels('connectWithoutScripts')}
            </Button>
        </p>
    );
}
