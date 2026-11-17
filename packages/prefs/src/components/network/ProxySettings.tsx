import { useTranslator } from '@mandor/i18n';
import { PROXY_MODES, type ProxyMode, type ProxySettings as Proxy } from '@mandor/schema';
import { Input, Select, SettingRow } from '@mandor/ui';
import { useState } from 'react';

import { bypassOf } from '../../network/proxy-bypass.js';
import { useNetworkSettings, type NetworkEditing } from '../../network/useNetworkSettings.js';
import { SecretRow } from './SecretRow.js';

const MODE_LABELS = {
    system: 'preferences:proxyModeSystem',
    environment: 'preferences:proxyModeEnvironment',
    custom: 'preferences:proxyModeCustom',
    none: 'preferences:proxyModeNone',
} as const satisfies Record<ProxyMode, string>;

const MODE_HELP = {
    system: 'preferences:proxyModeSystemHelp',
    environment: 'preferences:proxyModeEnvironmentHelp',
    custom: 'preferences:proxyModeCustomHelp',
    none: 'preferences:proxyModeNoneHelp',
} as const satisfies Record<ProxyMode, string>;

type WrittenProxyProps = { editing: NetworkEditing };

/** The proxy written here: where it is, what it leaves alone and who it asks for. */
function WrittenProxy({ editing }: WrittenProxyProps) {
    const translate = useTranslator();
    const { settings, kept } = editing.state;
    const [bypass, setBypass] = useState(settings.proxy.bypass.join(', '));
    const change = (proxy: Partial<Proxy>): void => {
        editing.write({ ...settings, proxy: { ...settings.proxy, ...proxy } });
    };

    return (
        <>
            <SettingRow
                help={translate('preferences:proxyUrlHelp')}
                label={translate('preferences:proxyUrl')}
            >
                <Input
                    label={translate('preferences:proxyUrl')}
                    onValueChange={(url) => {
                        change({ url: url.trim() });
                    }}
                    placeholder="http://proxy.example:8080"
                    value={settings.proxy.url}
                />
            </SettingRow>
            <SettingRow
                help={translate('preferences:proxyBypassHelp')}
                label={translate('preferences:proxyBypass')}
            >
                <Input
                    label={translate('preferences:proxyBypass')}
                    onValueChange={(typed) => {
                        setBypass(typed);
                        change({ bypass: bypassOf(typed) });
                    }}
                    placeholder="localhost, *.internal, .local"
                    value={bypass}
                />
            </SettingRow>
            <SettingRow
                help={translate('preferences:proxyUsernameHelp')}
                label={translate('preferences:proxyUsername')}
            >
                <Input
                    label={translate('preferences:proxyUsername')}
                    onValueChange={(username) => {
                        change({ username });
                    }}
                    value={settings.proxy.username}
                />
            </SettingRow>
            <SecretRow
                kept={kept.proxyPassword}
                label={translate('preferences:proxyPassword')}
                onKeep={(value) => editing.setSecret({ kind: 'proxy' }, value)}
            />
        </>
    );
}

/**
 * Where the requests of both kinds find their proxy. The system is the default: what the
 * operating system says, its PAC included, the way a browser on this machine would go.
 */
export function ProxySettings() {
    const translate = useTranslator();
    const editing = useNetworkSettings();

    if (editing === undefined) {
        return null;
    }

    const { settings } = editing.state;
    const mode = settings.proxy.mode;

    return (
        <>
            <SettingRow
                help={translate(MODE_HELP[mode])}
                label={translate('preferences:proxyMode')}
            >
                <Select
                    label={translate('preferences:proxyMode')}
                    onValueChange={(next) => {
                        editing.write({
                            ...settings,
                            proxy: { ...settings.proxy, mode: next },
                        });
                    }}
                    options={PROXY_MODES.map((value) => ({
                        label: translate(MODE_LABELS[value]),
                        value,
                    }))}
                    value={mode}
                />
            </SettingRow>
            <CustomProxy editing={editing} />
        </>
    );
}

function CustomProxy({ editing }: WrittenProxyProps) {
    if (editing.state.settings.proxy.mode !== 'custom') {
        return null;
    }

    return <WrittenProxy editing={editing} />;
}
