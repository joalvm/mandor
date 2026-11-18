import { useMessages } from '@mandor/i18n';
import { HTTP_VERSIONS, type RequestSettings } from '@mandor/schema';
import {
    NumberInput,
    Select,
    SettingRow,
    SettingsGroup,
    Switch,
    type SettingsEditing,
} from '@mandor/ui';

type RequestSendingSettingsProps = {
    editing: SettingsEditing<RequestSettings>;
};

/**
 * How long a send waits, how much it downloads, which HTTP it speaks and whether the jar of the
 * environment rides.
 */
export function RequestSendingSettings({ editing }: RequestSendingSettingsProps) {
    const labels = useMessages('requests');
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingsGroup title={labels('settingsSending')}>
            <SettingRow
                help={labels('timeoutHelp')}
                inherits={inheritanceOf('timeoutMs')}
                label={labels('timeoutMs')}
            >
                <NumberInput
                    label={labels('timeoutMs')}
                    min={1}
                    onNumber={(timeoutMs) => {
                        change({ timeoutMs });
                    }}
                    unit={labels('unitMs')}
                    value={values.timeoutMs}
                />
            </SettingRow>
            <SettingRow
                help={labels('maxResponseSizeHelp')}
                inherits={inheritanceOf('maxResponseSizeMiB')}
                label={labels('maxResponseSizeMiB')}
            >
                <NumberInput
                    label={labels('maxResponseSizeMiB')}
                    min={0}
                    onNumber={(maxResponseSizeMiB) => {
                        change({ maxResponseSizeMiB });
                    }}
                    unit={labels('unitMiB')}
                    value={values.maxResponseSizeMiB}
                />
            </SettingRow>
            <SettingRow
                help={labels('httpVersionHelp')}
                inherits={inheritanceOf('httpVersion')}
                label={labels('httpVersion')}
            >
                <Select
                    label={labels('httpVersion')}
                    onValueChange={(httpVersion) => {
                        change({ httpVersion });
                    }}
                    options={HTTP_VERSIONS.map((version) => ({
                        label: labels(`httpVersion-${version}`),
                        value: version,
                    }))}
                    value={values.httpVersion}
                />
            </SettingRow>
            <SettingRow
                help={labels('useCookieJarHelp')}
                inherits={inheritanceOf('useCookieJar')}
                label={labels('useCookieJar')}
            >
                <Switch
                    checked={values.useCookieJar}
                    label={labels('useCookieJar')}
                    onCheckedChange={(useCookieJar) => {
                        change({ useCookieJar });
                    }}
                />
            </SettingRow>
        </SettingsGroup>
    );
}
