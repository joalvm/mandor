import { useMessages } from '@mandor/i18n';
import { NumberInput, SettingRow, type SettingsEditing } from '@mandor/ui';

import type { SocketioDefaults } from '../../lib/connection-settings.js';

type AckTimeoutRowProps = {
    editing: SettingsEditing<SocketioDefaults>;
};

/** How long an emit that asked for an answer waits before it is reported as unanswered. */
export function AckTimeoutRow({ editing }: AckTimeoutRowProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingRow
            help={messages('ackTimeoutHelp')}
            inherits={inheritanceOf('ackTimeoutMs')}
            label={messages('ackTimeout')}
        >
            <NumberInput
                label={messages('ackTimeout')}
                min={1}
                onNumber={(ackTimeoutMs) => {
                    change({ ackTimeoutMs });
                }}
                unit={messages('unitMs')}
                value={values.ackTimeoutMs}
            />
        </SettingRow>
    );
}
