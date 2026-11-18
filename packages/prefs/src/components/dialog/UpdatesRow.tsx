import { useTranslator } from '@mandor/i18n';
import type { UpdateState } from '@mandor/ipc';
import { bridge, fireAndForget } from '@mandor/shell';
import { Button, SettingRow } from '@mandor/ui';
import { useEffect, useState } from 'react';

/**
 * The version that runs and the way to look for a newer one by hand. It reads the state from
 * main and pushes nothing of its own: the update feature, which also hangs the status line and
 * the palette, is not something the preferences know about.
 */
export function UpdatesRow() {
    const translate = useTranslator();
    const [state, setState] = useState<UpdateState | undefined>();

    useEffect(() => {
        let live = true;
        const stop = bridge.update.onChanged(setState);

        fireAndForget(
            bridge.update.state().then((result) => {
                if (live && result.ok) {
                    setState((known) => known ?? result.value);
                }
            }),
        );

        return () => {
            live = false;
            stop();
        };
    }, []);

    if (state === undefined) {
        return null;
    }

    const busy = state.phase === 'checking' || state.phase === 'downloading';
    const unsupported = state.support === 'unsupported';
    const reason = unsupported
        ? translate('preferences:updatesUnsupported')
        : translate('preferences:updatesBusy');

    return (
        <SettingRow
            help={translate('preferences:updatesCurrent', { version: state.current })}
            label={translate('preferences:updatesVersion')}
        >
            <Button
                disabled={busy || unsupported}
                disabledReason={busy || unsupported ? reason : undefined}
                onClick={() => {
                    fireAndForget(bridge.update.check());
                }}
            >
                {translate('preferences:updatesCheck')}
            </Button>
        </SettingRow>
    );
}
