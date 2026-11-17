import { useTranslator } from '@mandor/i18n';
import { bridge, fireAndForget, useFailureToast } from '@mandor/shell';
import { SettingRow, Switch } from '@mandor/ui';
import { useEffect, useState } from 'react';

/**
 * Whether scripts run on this machine at all. Main holds it and reads it as it builds each chain:
 * the row only shows it and asks main to turn it. Turning it back is one click, so it asks
 * nothing; off, nothing is deleted and nothing loses its approval.
 */
export function RunScriptsRow() {
    const translate = useTranslator();
    const notifyFailure = useFailureToast();
    const [enabled, setEnabled] = useState<boolean | undefined>();

    useEffect(() => {
        let live = true;

        fireAndForget(
            bridge.scripts.readSwitch().then((result) => {
                if (live && result.ok) {
                    setEnabled((known) => known ?? result.value.enabled);
                }
            }),
        );

        return () => {
            live = false;
        };
    }, []);

    if (enabled === undefined) {
        return null;
    }

    return (
        <SettingRow
            help={translate('preferences:runScriptsHelp')}
            label={translate('preferences:runScripts')}
        >
            <Switch
                checked={enabled}
                label={translate('preferences:runScripts')}
                onCheckedChange={(next) => {
                    setEnabled(next);
                    fireAndForget(
                        bridge.scripts.writeSwitch(next).then((result) => {
                            if (!result.ok) {
                                setEnabled(!next);
                                notifyFailure(result.error.code);
                            }
                        }),
                    );
                }}
            />
        </SettingRow>
    );
}
