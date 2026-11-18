import { useMessages } from '@mandor/i18n';
import { defaultsEditing, SettingsGroup, type SettingsEditing } from '@mandor/ui';
import { useStore } from 'zustand';

import { connectionDefaultsStore } from '../../connection-defaults-store.js';
import type { ConnectionDefaults } from '../../lib/connection-settings.js';
import { AckTimeoutRow } from './AckTimeoutRow.js';
import { HandshakeTimeoutRow } from './HandshakeTimeoutRow.js';
import { KeepaliveRows } from './KeepaliveRows.js';
import { MessageSizeRow } from './MessageSizeRow.js';
import { RetryRows } from './RetryRows.js';
import { WebsocketLimitRows } from './WebsocketLimitRows.js';

/**
 * The defaults of the connections, in the settings of the app: the rows a connection draws,
 * with nothing above them to inherit from. A change reaches every connection that left the row
 * alone, the next time it dials.
 */
export function ConnectionDefaultsSection() {
    const messages = useMessages('connections');
    const defaults = useStore(connectionDefaultsStore, (state) => state.defaults);
    const setDefaults = useStore(connectionDefaultsStore, (state) => state.setDefaults);

    function groupEditing<Group extends keyof ConnectionDefaults>(
        group: Group,
    ): SettingsEditing<ConnectionDefaults[Group]> {
        return defaultsEditing(defaults[group], (values) => {
            setDefaults({ ...defaults, [group]: values });
        });
    }

    return (
        <div
            className="flex min-h-0 min-w-0 flex-col gap-gap-section"
            data-part="connection-defaults"
        >
            <p className="px-pad-control text-xs text-text-secondary">{messages('defaultsHelp')}</p>
            <SettingsGroup title={messages('sectionHandshake')}>
                <HandshakeTimeoutRow editing={groupEditing('handshake')} />
            </SettingsGroup>
            <SettingsGroup title={messages('sectionRetry')}>
                <RetryRows editing={groupEditing('retry')} />
            </SettingsGroup>
            <SettingsGroup title={messages('sectionKeepalive')}>
                <KeepaliveRows editing={groupEditing('keepalive')} />
            </SettingsGroup>
            <SettingsGroup title={messages('transportWebsocket')}>
                <WebsocketLimitRows editing={groupEditing('websocket')} />
            </SettingsGroup>
            <SettingsGroup title={messages('transportSocketio')}>
                <AckTimeoutRow editing={groupEditing('socketio')} />
                <MessageSizeRow editing={groupEditing('socketio')} />
            </SettingsGroup>
        </div>
    );
}
