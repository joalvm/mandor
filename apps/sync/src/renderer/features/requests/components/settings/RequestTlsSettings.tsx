import { useMessages } from '@mandor/i18n';
import { TLS_VERSIONS, type RequestSettings, type TlsVersion } from '@mandor/schema';
import { Input, Select, SettingRow, SettingsGroup, Switch, type SettingsEditing } from '@mandor/ui';

type RequestTlsSettingsProps = {
    editing: SettingsEditing<RequestSettings>;
};

const VERSION_LABELS = {
    auto: 'tlsVersionAuto',
    TLSv1: 'tlsVersion10',
    'TLSv1.1': 'tlsVersion11',
    'TLSv1.2': 'tlsVersion12',
    'TLSv1.3': 'tlsVersion13',
} as const satisfies Record<TlsVersion, string>;

type VersionRowProps = {
    editing: SettingsEditing<RequestSettings>;
    setting: 'tlsMinVersion' | 'tlsMaxVersion';
    help: 'tlsMinVersionHelp' | 'tlsMaxVersionHelp';
};

/** One bound of the handshake: `auto` leaves it to the runtime. */
function VersionRow({ editing, setting, help }: VersionRowProps) {
    const labels = useMessages('requests');
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingRow help={labels(help)} inherits={inheritanceOf(setting)} label={labels(setting)}>
            <Select
                label={labels(setting)}
                onValueChange={(version) => {
                    const patch: Partial<RequestSettings> = {};

                    patch[setting] = version;
                    change(patch);
                }}
                options={TLS_VERSIONS.map((version) => ({
                    label: labels(VERSION_LABELS[version]),
                    value: version,
                }))}
                value={values[setting]}
            />
        </SettingRow>
    );
}

/**
 * How much a send trusts the wire, and what its handshake offers. That the check is off is said
 * in place, in the line under the switch, not in a toast that is gone before it is read.
 */
export function RequestTlsSettings({ editing }: RequestTlsSettingsProps) {
    const labels = useMessages('requests');
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingsGroup title={labels('settingsTls')}>
            <SettingRow
                help={labels(values.validateTls ? 'validateTlsHelp' : 'tlsOffHelp')}
                inherits={inheritanceOf('validateTls')}
                label={labels('validateTls')}
            >
                <Switch
                    checked={values.validateTls}
                    label={labels('validateTls')}
                    onCheckedChange={(validateTls) => {
                        change({ validateTls });
                    }}
                />
            </SettingRow>
            <VersionRow editing={editing} help="tlsMinVersionHelp" setting="tlsMinVersion" />
            <VersionRow editing={editing} help="tlsMaxVersionHelp" setting="tlsMaxVersion" />
            <SettingRow
                help={labels('tlsCiphersHelp')}
                inherits={inheritanceOf('tlsCiphers')}
                label={labels('tlsCiphers')}
                stacked
            >
                <Input
                    label={labels('tlsCiphers')}
                    onValueChange={(tlsCiphers) => {
                        change({ tlsCiphers });
                    }}
                    placeholder="TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256"
                    value={values.tlsCiphers}
                />
            </SettingRow>
        </SettingsGroup>
    );
}
