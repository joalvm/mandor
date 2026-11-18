import { useMessages } from '@mandor/i18n';
import { NumberInput, SettingRow, type SettingsEditing } from '@mandor/ui';

import type { ResolvedHandshake } from '../../lib/connection-settings.js';

type HandshakeTimeoutRowProps = {
    editing: SettingsEditing<ResolvedHandshake>;
};

/** How long the dial waits for the server to answer the handshake before it gives up. */
export function HandshakeTimeoutRow({ editing }: HandshakeTimeoutRowProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingRow
            help={messages('handshakeTimeoutHelp')}
            inherits={inheritanceOf('timeoutMs')}
            label={messages('handshakeTimeout')}
        >
            <NumberInput
                label={messages('handshakeTimeout')}
                min={1}
                onNumber={(timeoutMs) => {
                    change({ timeoutMs });
                }}
                unit={messages('unitMs')}
                value={values.timeoutMs}
            />
        </SettingRow>
    );
}
