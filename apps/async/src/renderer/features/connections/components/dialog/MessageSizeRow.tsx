import { useMessages } from '@mandor/i18n';
import { NumberInput, SettingRow, type SettingsEditing } from '@mandor/ui';

type MessageSizeRowProps = {
    editing: SettingsEditing<{ maximumMessageSizeKiB: number }>;
};

/** How big a frame a socket takes before it hangs up, whichever protocol rides on it. */
export function MessageSizeRow({ editing }: MessageSizeRowProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingRow
            help={messages('maximumMessageSizeHelp')}
            inherits={inheritanceOf('maximumMessageSizeKiB')}
            label={messages('maximumMessageSize')}
        >
            <NumberInput
                label={messages('maximumMessageSize')}
                min={1}
                onNumber={(maximumMessageSizeKiB) => {
                    change({ maximumMessageSizeKiB });
                }}
                unit={messages('unitKib')}
                value={values.maximumMessageSizeKiB}
            />
        </SettingRow>
    );
}
