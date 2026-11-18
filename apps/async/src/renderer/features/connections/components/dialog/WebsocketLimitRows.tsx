import { useMessages } from '@mandor/i18n';
import { SettingRow, Switch, type SettingsEditing } from '@mandor/ui';

import type { WebsocketDefaults } from '../../lib/connection-settings.js';
import { MessageSizeRow } from './MessageSizeRow.js';

type WebsocketLimitRowsProps = {
    editing: SettingsEditing<WebsocketDefaults>;
};

/** How big a frame a websocket takes before it hangs up, and whether it checks who answers. */
export function WebsocketLimitRows({ editing }: WebsocketLimitRowsProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    return (
        <>
            <MessageSizeRow editing={editing} />
            <SettingRow
                help={messages('verifyCertificateHelp')}
                inherits={inheritanceOf('verifyCertificate')}
                label={messages('verifyCertificate')}
            >
                <Switch
                    checked={values.verifyCertificate}
                    label={messages('verifyCertificate')}
                    onCheckedChange={(verifyCertificate) => {
                        change({ verifyCertificate });
                    }}
                />
            </SettingRow>
        </>
    );
}
