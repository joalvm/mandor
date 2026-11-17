import { useMessages } from '@mandor/i18n';
import {
    NumberInput,
    SettingDependents,
    SettingRow,
    Switch,
    type SettingsEditing,
} from '@mandor/ui';

import type { ResolvedKeepalive } from '../../lib/connection-settings.js';

type KeepaliveRowsProps = {
    editing: SettingsEditing<ResolvedKeepalive>;
};

/**
 * Whether a connection proves it is alive while nothing is being said: a ping every interval,
 * and a pong that has to answer within the timeout. Both hang from the switch.
 */
export function KeepaliveRows({ editing }: KeepaliveRowsProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    return (
        <>
            <SettingRow
                help={messages('keepaliveHelp')}
                inherits={inheritanceOf('enabled')}
                label={messages('keepaliveSetting')}
            >
                <Switch
                    checked={values.enabled}
                    label={messages('keepaliveSetting')}
                    onCheckedChange={(enabled) => {
                        change({ enabled });
                    }}
                />
            </SettingRow>
            <KeepaliveDependents editing={editing} />
        </>
    );
}

function KeepaliveDependents({ editing }: KeepaliveRowsProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    if (!values.enabled) {
        return null;
    }

    return (
        <SettingDependents>
            <SettingRow inherits={inheritanceOf('intervalMs')} label={messages('interval')}>
                <NumberInput
                    label={messages('interval')}
                    min={1}
                    onNumber={(intervalMs) => {
                        change({ intervalMs });
                    }}
                    unit={messages('unitMs')}
                    value={values.intervalMs}
                />
            </SettingRow>
            <SettingRow inherits={inheritanceOf('pongTimeoutMs')} label={messages('pongTimeout')}>
                <NumberInput
                    label={messages('pongTimeout')}
                    min={1}
                    onNumber={(pongTimeoutMs) => {
                        change({ pongTimeoutMs });
                    }}
                    unit={messages('unitMs')}
                    value={values.pongTimeoutMs}
                />
            </SettingRow>
        </SettingDependents>
    );
}
