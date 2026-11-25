import { EmptyGroup, TabBody, TabIndicator, TabKind, TabStatus, useTab } from '@mandor/shell';

import { composedEvent, subscribeComposedEvents } from '../../events/composed-event.js';
import { composerUnsaved } from '../../events/composer-unsaved.js';
import { saveEventInComposer } from '../../events/save-event-in-composer.js';
import { ConnectionPanel } from './components/panel/ConnectionPanel.js';
import { NoConnectionOpen } from './components/panel/NoConnectionOpen.js';
import { CONNECTIONS_SECTION_ID } from './components/sidebar/ConnectionsSection.js';
import { ConnectionStatusDot } from './components/tab/ConnectionStatusDot.js';
import { ConnectionTransportMark } from './components/tab/ConnectionTransportMark.js';
import { connectionTitle, subscribeConnectionTitles } from './connection-tab-kind.js';
import { useConnectionConsole } from './hooks/useConnectionConsole.js';
import { useConnectionPushes } from './hooks/useConnectionPushes.js';
import { useScriptNotes } from './hooks/useScriptNotes.js';
import { connectionHeld } from './lib/connection-held.js';
import { releaseConnection } from './lib/release-connection.js';

/** The tab of a connection is named by the id of the connection it holds. */
function TabConnectionPanel() {
    const { resource, tabId } = useTab();

    return <ConnectionPanel connectionId={tabId} resource={resource} />;
}

function TabTransportMark() {
    return <ConnectionTransportMark connectionId={useTab().tabId} />;
}

function TabStatusDot() {
    return <ConnectionStatusDot connectionId={useTab().tabId} />;
}

/**
 * The connection tab kind, and what keeps its connections current while the window lives. The
 * page of an empty group goes with it: it is about connections. The tab is named only from its
 * row in the lateral, so it has no editor of its own.
 *
 * The tab is dirty while its composer holds an edit of a collection event that was not saved:
 * closing it by hand asks first, because the composer dies with the tab.
 *
 * What it has open inside is the message its composer holds: the lateral marks that one in the
 * collection while the tab is in front, since the message has no tab of its own.
 */
export function ConnectionTabKind() {
    useConnectionPushes();
    useScriptNotes();
    useConnectionConsole();

    return (
        <>
            <EmptyGroup>
                <NoConnectionOpen />
            </EmptyGroup>
            <TabKind
                closable
                dirty={composerUnsaved}
                holds={connectionHeld}
                icon="connection"
                id="connection"
                inside={composedEvent}
                release={releaseConnection}
                save={saveEventInComposer}
                section={CONNECTIONS_SECTION_ID}
                subscribeInside={subscribeComposedEvents}
                subscribeTitles={subscribeConnectionTitles}
                title={connectionTitle}
            >
                <TabIndicator>
                    <TabTransportMark />
                </TabIndicator>
                <TabBody>
                    <TabConnectionPanel />
                </TabBody>
                <TabStatus>
                    <TabStatusDot />
                </TabStatus>
            </TabKind>
        </>
    );
}
