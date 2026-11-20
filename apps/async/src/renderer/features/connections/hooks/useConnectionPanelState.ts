import type { ResourceUri } from '@mandor/schema';

import { useActivityStore } from '../../../activity/hooks/useActivityStore.js';
import { selectActivityFor } from '../../../activity/select-activity-for.js';
import { selectConnectionStateFor, selectFaultFor, selectOpenedAtFor } from '../selectors.js';
import { timelineWithFault } from '../lib/timeline-with-fault.js';
import { useConnectionsStore } from './useConnectionsStore.js';

export function useConnectionPanelState(connectionId: string, resource: ResourceUri) {
    const connection = useConnectionsStore((state) =>
        state.connections.find((entry) => entry.id === connectionId),
    );
    const wsState = useConnectionsStore((state) => selectConnectionStateFor(connectionId)(state));
    const entries = useActivityStore((state) => selectActivityFor(resource)(state));
    const fault = useConnectionsStore((state) => selectFaultFor(connectionId)(state));
    const openedAt = useConnectionsStore((state) => selectOpenedAtFor(connectionId)(state));

    // The timeline is what the panel shows of both stores: the buffer plus the fault standing
    // where it happened, so the panel never assembles the two halves itself.
    return {
        connection,
        entries,
        fault,
        openedAt,
        timeline: timelineWithFault(entries, fault),
        wsState,
    };
}
