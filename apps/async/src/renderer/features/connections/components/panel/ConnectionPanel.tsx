import { envStore } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import type { ResourceUri } from '@mandor/schema';
import { useFailureToast, useResourceSection, useSplit } from '@mandor/shell';
import { Card, SplitHalf, SplitPane, useToast } from '@mandor/ui';
import type { ComponentProps, PropsWithChildren } from 'react';
import { useStore } from 'zustand';

import { FaultActionsContext } from '../../../../activity/fault-actions.js';
import { useComposerEvent } from '../../hooks/useComposerEvent.js';
import { useComposerSaveShortcut } from '../../hooks/useComposerSaveShortcut.js';
import { useConnectionEditing } from '../../hooks/useConnectionEditing.js';
import { useConnectionPanelState } from '../../hooks/useConnectionPanelState.js';
import { useConnectionRecording } from '../../hooks/useConnectionRecording.js';
import { useWorkspaceScope } from '../../hooks/useWorkspaceScope.js';
import { namespaceOf } from '../../lib/connection-settings.js';
import { connectionActions } from '../../lib/connection-actions.js';
import { DEFAULT_CONNECTION_SECTION } from '../../lib/connection-section.js';

import { ConnectionStrip } from '../strip/ConnectionStrip.js';
import { ConnectionActivity } from './ConnectionActivity.js';
import { ConnectionCrumbs } from './ConnectionCrumbs.js';
import { ConnectionToolbar } from './ConnectionToolbar.js';
import { NoEventOpen } from './NoEventOpen.js';
import { RecordButton } from './RecordButton.js';

type ConnectionPanelProps = {
    connectionId: string;
    /** The timeline is filed under the resource, so a tab moved between groups keeps it. */
    resource: ResourceUri;
};

/** The message takes two fifths: the activity is what is read at length. */
const MESSAGE_SHARE = 40;

/** Root of the connections feature: the only component that reads the store. Children get props. */
export function ConnectionPanel({ connectionId, resource }: ConnectionPanelProps) {
    const notifyFailure = useFailureToast();
    const messages = useMessages('connections');
    const toast = useToast();
    const scope = useWorkspaceScope();
    const environments = useStore(envStore, (state) => state.environments);
    const { connection, openedAt, timeline, wsState } = useConnectionPanelState(
        connectionId,
        resource,
    );
    const {
        composerEvent,
        crumbs,
        eventName,
        onClose,
        onExpectAckChange,
        onPayloadChange,
        onSchemaChange,
        onPayloadTypeChange,
    } = useComposerEvent(connectionId);
    const [section, setSection] = useResourceSection(resource, DEFAULT_CONNECTION_SECTION);
    const [split, setSplit] = useSplit('connection', MESSAGE_SHARE);
    const live = wsState === 'open' || wsState === 'connecting';
    const {
        environment,
        onDescriptionChange,
        onEnvironmentChange,
        onUrlChange,
        onVariablesChange,
    } = useConnectionEditing({ connection, environments, scope });
    const { onRecordToggle, recording } = useConnectionRecording({
        connectionId,
        connectionName: connection?.name ?? connectionId,
    });
    const onSaveShortcut = useComposerSaveShortcut({
        connectionId,
        onError: (code) => {
            notifyFailure(code);
        },
    });

    if (connection === undefined) {
        return null;
    }

    // A plain function, so it can wait for the guard: the actions act on a connection that is.
    const { onConnectWithoutScripts, onSend, onToggle } = connectionActions({
        composerEvent,
        connection,
        connectionId,
        eventName,
        live,
        notify: toast.notify,
        payloadType: composerEvent?.payloadType ?? 'json',
        scope,
        translate: messages,
    });

    return (
        <div
            aria-label={messages('panelLabel')}
            className="flex h-full min-h-0 flex-col gap-gap-gutter"
            data-part="connection-panel"
            onKeyDown={onSaveShortcut}
            role="group"
        >
            <Card aria-label={messages('urlLabel')} size="content">
                <ConnectionToolbar
                    environment={environment}
                    environmentId={connection.environmentId ?? null}
                    environments={environments}
                    live={live}
                    onEnvironmentChange={onEnvironmentChange}
                    onToggle={onToggle}
                    onUrlChange={onUrlChange}
                    onVariablesChange={onVariablesChange}
                    openedAt={openedAt}
                    pending={wsState === 'connecting' || wsState === 'closing'}
                    url={connection.url}
                    wsState={wsState}
                    namespace={namespaceOf(connection)}
                />
            </Card>
            <FaultActionsContext value={{ connectWithoutScripts: onConnectWithoutScripts }}>
                <ComposerArea
                    connectionId={connectionId}
                    crumbs={crumbs}
                    description={connection.description ?? ''}
                    environment={environment}
                    event={composerEvent}
                    eventName={eventName}
                    onClose={onClose}
                    onDescriptionChange={onDescriptionChange}
                    onExpectAckChange={onExpectAckChange}
                    onPayloadChange={onPayloadChange}
                    onPayloadTypeChange={onPayloadTypeChange}
                    onSchemaChange={onSchemaChange}
                    onSectionChange={setSection}
                    onSend={onSend}
                    onSplitChange={setSplit}
                    onVariablesChange={onVariablesChange}
                    resource={resource}
                    section={section}
                    split={split}
                    timeline={timeline}
                    transport={connection.transport}
                >
                    <RecordButton onToggle={onRecordToggle} recording={recording} />
                </ComposerArea>
            </FaultActionsContext>
        </div>
    );
}

type ComposerAreaProps = PropsWithChildren<
    Omit<ComponentProps<typeof ConnectionStrip>, 'payloadType'> & {
        crumbs: readonly string[];
        onClose: () => void;
        onSplitChange: (split: number) => void;
        resource: ResourceUri;
        split: number;
        timeline: ComponentProps<typeof ConnectionActivity>['timeline'];
    }
>;

/**
 * What sits under the card of the connection: the event beside the activity, or over it when the
 * group is too narrow for both, each on a card of its own with the gutter of the frame between
 * them. The activity belongs to the connection, so it stays whether an event is open or not; only
 * the half of the event changes.
 */
function ComposerArea({
    children,
    crumbs,
    onClose,
    onSplitChange,
    resource,
    split,
    timeline,
    ...strip
}: ComposerAreaProps) {
    const messages = useMessages('connections');

    return (
        <SplitPane
            className="min-h-0 flex-1"
            direction="fit"
            gap="gutter"
            initial={MESSAGE_SHARE}
            label={messages('resizeSplit')}
            onValueChange={onSplitChange}
            value={split}
        >
            <SplitHalf>
                <Card aria-label={messages('message')}>
                    <EventHalf crumbs={crumbs} onClose={onClose} {...strip} />
                </Card>
            </SplitHalf>
            <SplitHalf>
                <Card aria-label={messages('activityLog')}>
                    <ConnectionActivity resource={resource} timeline={timeline}>
                        {children}
                    </ConnectionActivity>
                </Card>
            </SplitHalf>
        </SplitPane>
    );
}

type EventHalfProps = Omit<ComponentProps<typeof ConnectionStrip>, 'payloadType'> & {
    crumbs: readonly string[];
    onClose: () => void;
};

/** The event the connection holds, under the trail that names it, or the way to open one. */
function EventHalf({ crumbs, onClose, ...strip }: EventHalfProps) {
    if (strip.event === undefined) {
        return <NoEventOpen />;
    }

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="connection-event">
            <ConnectionCrumbs onClose={onClose} parts={crumbs} transport={strip.transport} />
            <ConnectionStrip {...strip} payloadType={strip.event.payloadType} />
        </div>
    );
}
