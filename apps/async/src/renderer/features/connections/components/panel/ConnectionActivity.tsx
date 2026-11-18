import { useMessages } from '@mandor/i18n';
import type { ResourceUri } from '@mandor/schema';

import type { ActivityEntry } from '../../../../activity/activity-entry.js';
import { activityStore } from '../../../../activity/activity-store.js';
import { ActivityPanel } from '../../../../activity/components/panel/ActivityPanel.js';
import { useActivityExport } from '../../hooks/useActivityExport.js';

type ConnectionActivityProps = {
    /** The timeline of the connection, already narrowed to what its resource holds. */
    timeline: readonly ActivityEntry[];
    /** The resource the timeline is filed under, and what clearing empties. */
    resource: ResourceUri;
};

/**
 * The half of the split that says what the connection moved: the timeline, wired to the export
 * that writes it out of the app and the clear that empties what arrived while it was open.
 */
export function ConnectionActivity({ timeline, resource }: ConnectionActivityProps) {
    const messages = useMessages('connections');
    const onExport = useActivityExport(timeline);

    return (
        <ActivityPanel
            entries={timeline}
            label={messages('activityLog')}
            onClear={() => {
                activityStore.getState().clearActivity(resource);
            }}
            onExport={onExport}
            resource={resource}
            resizeLabel={messages('resizeDetail')}
        />
    );
}
