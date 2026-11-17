import { envStore } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import type { IconName } from '@mandor/icons';
import type { WsState } from '@mandor/ipc';
import type { Connection, ConnectionTransport, Environment, Variable } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { Dialog, DialogBody, DialogNav, DialogNavItem, DialogNavList } from '@mandor/ui';
import { useState, type ComponentType } from 'react';
import { useStore } from 'zustand';

import { connectionsStore } from '../../connections-store.js';
import {
    scheduleConnectionWrite,
    type ConnectionWrite,
} from '../../lib/pending-connection-write.js';
import { selectConnectionStateFor } from '../../selectors.js';
import type { WorkspaceScope } from '../../lib/workspace-scope.js';
import { ConnectionAuthSection } from './ConnectionAuthSection.js';
import { SettingsAuthSection } from './SettingsAuthSection.js';
import { SettingsConnectionSection } from './SettingsConnectionSection.js';
import { SettingsHeadersSection } from './SettingsHeadersSection.js';
import { SettingsKeepaliveSection } from './SettingsKeepaliveSection.js';
import { SettingsParamsSection } from './SettingsParamsSection.js';
import { SettingsRetrySection } from './SettingsRetrySection.js';
import { SettingsScriptsSection } from './SettingsScriptsSection.js';

type SettingsSection =
    | 'auth'
    | 'connection'
    | 'connectionAuth'
    | 'headers'
    | 'keepalive'
    | 'params'
    | 'retry'
    | 'scripts';

type SettingsSectionSpec = {
    icon: IconName;
    id: SettingsSection;
    labelKey:
        | 'sectionAuth'
        | 'sectionConnection'
        | 'sectionConnectionAuth'
        | 'sectionHeaders'
        | 'sectionKeepalive'
        | 'sectionParams'
        | 'sectionRetry'
        | 'sectionScripts';
};

/** What every form of the dialog is handed; each one takes the part of it that it edits. */
type SettingsFormProps = {
    connection: Connection;
    environment: Environment | undefined;
    workspaceId: string;
    onConnectionChange: (changes: ConnectionWrite) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/** The form each section opens. A new section is one more entry here, and no new branch. */
const FORMS: Record<SettingsSection, ComponentType<SettingsFormProps>> = {
    auth: SettingsAuthSection,
    connection: SettingsConnectionSection,
    connectionAuth: ConnectionAuthSection,
    headers: SettingsHeadersSection,
    keepalive: SettingsKeepaliveSection,
    params: SettingsParamsSection,
    retry: SettingsRetrySection,
    scripts: SettingsScriptsSection,
};

/** The sections every transport answers by, in the order they are read. */
const SHARED_SECTIONS: readonly SettingsSectionSpec[] = [
    { icon: 'braces', id: 'params', labelKey: 'sectionParams' },
    { icon: 'headers', id: 'headers', labelKey: 'sectionHeaders' },
    { icon: 'refresh', id: 'retry', labelKey: 'sectionRetry' },
    { icon: 'keepalive', id: 'keepalive', labelKey: 'sectionKeepalive' },
    { icon: 'code', id: 'scripts', labelKey: 'sectionScripts' },
];

/** The auth of the handshake, both transports dial through one: scheme and inheritance. */
const CONNECTION_AUTH: SettingsSectionSpec = {
    icon: 'key',
    id: 'connectionAuth',
    labelKey: 'sectionConnectionAuth',
};

/** The sections of the settings dialog, keyed by the transport that asks for them. */
const SECTIONS: Record<ConnectionTransport, readonly SettingsSectionSpec[]> = {
    socketio: [
        { icon: 'connection', id: 'connection', labelKey: 'sectionConnection' },
        { icon: 'key', id: 'auth', labelKey: 'sectionAuth' },
        CONNECTION_AUTH,
        ...SHARED_SECTIONS,
    ],
    websocket: [
        { icon: 'connection', id: 'connection', labelKey: 'sectionConnection' },
        CONNECTION_AUTH,
        ...SHARED_SECTIONS,
    ],
};

/** The states of a socket a change made now does not reach: it dialed with what it had. */
const DIALED: ReadonlySet<WsState> = new Set<WsState>(['connecting', 'open', 'reconnecting']);

/**
 * Tells, over the form, that what is changed here waits for the next connect. Nothing is blocked:
 * every field still edits, the connection just keeps the socket it has until it dials again.
 */
function AppliesOnNextConnect({ connectionId }: { connectionId: string }) {
    const messages = useMessages('connections');
    const state = useStore(connectionsStore, selectConnectionStateFor(connectionId));

    if (!DIALED.has(state)) {
        return null;
    }

    return (
        <p className="py-1 text-xs text-text-secondary" data-part="applies-on-next-connect">
            {messages('appliesOnNextConnect')}
        </p>
    );
}

type ConnectionSettingsDialogProps = {
    closeLabel: string;
    connection: Connection;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    scope: WorkspaceScope;
};

/**
 * The whole configuration of one connection, in master and detail: the sections on the left,
 * the form of the one being read on the right. Which one is on screen is where the reader
 * stands, not a fact of the connection, so it lives here and closing the dialog forgets it.
 * Every change writes itself through the same pause that edits from the strip travel by, and
 * the variables a header names go to the environment the connection resolves against.
 */
export function ConnectionSettingsDialog({
    closeLabel,
    connection,
    onOpenChange,
    open,
    scope,
}: ConnectionSettingsDialogProps) {
    const messages = useMessages('connections');
    const environments = useStore(envStore, (state) => state.environments);
    const sections = SECTIONS[connection.transport];
    const [chosen, setSection] = useState<SettingsSection>('connection');
    // The transport moved under the reader's feet: a section it does not carry reads as the first.
    const section = sections.some((entry) => entry.id === chosen) ? chosen : 'connection';
    const environment = environments.find((entry) => entry.id === connection.environmentId);
    const title = messages(
        sections.find((entry) => entry.id === section)?.labelKey ?? 'settingsTitle',
    );
    const Form = FORMS[section];

    function onConnectionChange(changes: ConnectionWrite): void {
        scheduleConnectionWrite(scope, connection, changes);
    }

    function onVariablesChange(variables: readonly Variable[]): void {
        if (environment !== undefined) {
            fireAndForget(
                envStore.getState().setVariables(scope.workspaceId, environment.id, variables),
            );
        }
    }

    return (
        // modal-policy: short-config-form
        <Dialog closeLabel={closeLabel} onOpenChange={onOpenChange} open={open} title={title}>
            <DialogNav>
                <DialogNavList label={messages('sections')}>
                    {sections.map((entry) => (
                        <DialogNavItem
                            icon={entry.icon}
                            key={entry.id}
                            label={messages(entry.labelKey)}
                            onSelect={() => {
                                setSection(entry.id);
                            }}
                            selected={section === entry.id}
                        />
                    ))}
                </DialogNavList>
            </DialogNav>
            <DialogBody>
                <AppliesOnNextConnect connectionId={connection.id} />
                <Form
                    connection={connection}
                    environment={environment}
                    workspaceId={scope.workspaceId}
                    onConnectionChange={onConnectionChange}
                    onVariablesChange={onVariablesChange}
                />
            </DialogBody>
        </Dialog>
    );
}
