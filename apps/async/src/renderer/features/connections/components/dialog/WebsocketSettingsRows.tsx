import { useMessages } from '@mandor/i18n';
import { Input, SettingRow } from '@mandor/ui';
import type { Connection } from '@mandor/schema';
import { useState } from 'react';

import { useConnectionOverrides } from '../../hooks/useConnectionOverrides.js';
import { resolvedWebsocket } from '../../lib/connection-settings.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';
import {
    frameReads,
    subprotocolsDialable,
    subprotocolsOf,
} from '../../lib/typed-socket-options.js';
import { WebsocketLimitRows } from './WebsocketLimitRows.js';

type WebsocketSettingsRowsProps = {
    connection: Connection;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

/**
 * The rows a websocket connection dials with: the frame it wraps messages in and the
 * subprotocols it offers, which are its own, then the frame ceiling and the certificate check,
 * which follow the defaults of the app until the connection decides. Every write keeps the
 * group as the file has it, so a row never turns a default into a value of its own.
 */
export function WebsocketSettingsRows({
    connection,
    onConnectionChange,
}: WebsocketSettingsRowsProps) {
    const messages = useMessages('connections');
    const saved = connection.websocket;
    /** The line of subprotocols as it is being typed; null keeps the saved one on screen. */
    const [draft, setDraft] = useState<string | null>(null);
    /** The frame template as it is being typed; null keeps the saved one on screen. */
    const [frameDraft, setFrameDraft] = useState<string | null>(null);
    const frameShown = frameDraft ?? saved?.frame ?? '';
    // The group is the overrides whole: the frame and the subprotocols ride through untouched.
    const limits = useConnectionOverrides('websocket', saved ?? {}, (websocket) => {
        onConnectionChange({ websocket });
    });

    return (
        <>
            <SettingRow
                help={messages('frameTemplateHelp')}
                label={messages('frameTemplate')}
                stacked
            >
                <Input
                    className="w-full font-mono"
                    invalid={!frameReads(frameShown)}
                    label={messages('frameTemplate')}
                    onValueChange={(raw) => {
                        setFrameDraft(raw);

                        if (frameReads(raw)) {
                            const frame = raw.trim() === '' ? undefined : raw;

                            onConnectionChange({ websocket: { ...saved, frame } });
                        }
                    }}
                    value={frameShown}
                />
            </SettingRow>
            <SettingRow help={messages('subprotocolsHelp')} label={messages('subprotocols')}>
                <Input
                    className="w-full font-mono"
                    invalid={draft !== null && !subprotocolsDialable(draft)}
                    label={messages('subprotocols')}
                    onValueChange={(raw) => {
                        setDraft(raw);

                        if (subprotocolsDialable(raw)) {
                            onConnectionChange({
                                websocket: { ...saved, subprotocols: subprotocolsOf(raw) },
                            });
                        }
                    }}
                    value={draft ?? resolvedWebsocket(connection).subprotocols.join(', ')}
                />
            </SettingRow>
            <WebsocketLimitRows editing={limits} />
        </>
    );
}
