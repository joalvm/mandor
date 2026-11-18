import type { NetworkFilePurpose, NetworkState } from '@mandor/ipc';
import { HOST_PATTERN, networkSettingsSchema, type NetworkSettings } from '@mandor/schema';
import { bridge, fireAndForget } from '@mandor/shell';
import { useCallback, useEffect, useState } from 'react';

/** Whose secret a field keeps: the password of the written proxy, or one passphrase. */
type SecretTarget = { kind: 'proxy' } | { kind: 'certificate'; id: string };

export type NetworkEditing = {
    state: NetworkState;
    write: (settings: NetworkSettings) => void;
    /** Whether the keychain took the value; the form keeps what was typed when it did not. */
    setSecret: (target: SecretTarget, value: string) => Promise<boolean>;
    /** The path the user picked in the dialog of the system, or null. */
    chooseFile: (purpose: NetworkFilePurpose) => Promise<string | null>;
};

/**
 * The writes leave one after another: main answers each on its own, and two in flight could
 * land in the other order, leaving on disk the settings of a keystroke ago.
 */
let writing: Promise<unknown> = Promise.resolve();

/** A host half typed in the bypass leaves the list; the rest of it still goes. */
function sendable(settings: NetworkSettings): NetworkSettings {
    const bypass = settings.proxy.bypass.filter((host) => HOST_PATTERN.test(host));

    return { ...settings, proxy: { ...settings.proxy, bypass } };
}

function keptAfter(kept: NetworkState['kept'], target: SecretTarget, value: string) {
    if (target.kind === 'proxy') {
        return { ...kept, proxyPassword: value !== '' };
    }

    const others = kept.passphrases.filter((id) => id !== target.id);

    return { ...kept, passphrases: value === '' ? others : [...others, target.id] };
}

/**
 * The network settings of this machine as the form edits them. The form keeps what is typed;
 * main gets the settings once they hold their shape, so an address half written never leaves
 * the window and never replaces the one that worked. Nothing is refused on the way: a value
 * that is not yet whole simply waits.
 */
export function useNetworkSettings(): NetworkEditing | undefined {
    const [state, setState] = useState<NetworkState | undefined>();

    useEffect(() => {
        let live = true;

        fireAndForget(
            bridge.network.read().then((result) => {
                if (live && result.ok) {
                    setState(result.value);
                }
            }),
        );

        return () => {
            live = false;
        };
    }, []);

    const write = useCallback((settings: NetworkSettings) => {
        setState((known) => (known === undefined ? known : { ...known, settings }));

        const parsed = networkSettingsSchema.safeParse(sendable(settings));

        if (parsed.success) {
            const sent = writing.then(() => bridge.network.write(parsed.data));

            fireAndForget(sent);
            // A write that failed reaches the log and does not hold the next one back.
            writing = sent.catch(() => undefined);
        }
    }, []);

    const setSecret = useCallback(async (target: SecretTarget, value: string) => {
        const result = await bridge.network.setSecret({ target, value });

        if (result.ok) {
            setState((known) =>
                known === undefined
                    ? known
                    : { ...known, kept: keptAfter(known.kept, target, value) },
            );
        }

        return result.ok;
    }, []);

    const chooseFile = useCallback(async (purpose: NetworkFilePurpose) => {
        const result = await bridge.network.chooseFile(purpose);

        return result.ok ? result.value : null;
    }, []);

    return state === undefined ? undefined : { state, write, setSecret, chooseFile };
}
