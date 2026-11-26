import type { Result, UpdateState } from '@mandor/ipc';
import type { PreferenceKey } from '@mandor/schema';
import { bridge, fireAndForget } from '@mandor/shell';
import { useEffect } from 'react';

import { readAppPreferences } from '../preferences-storage.js';

type WritePreference = (key: PreferenceKey, value: string) => void;

/** A version with a prerelease part, as semver writes it: `0.1.0-beta.1`. */
function runsABeta(answer: Result<UpdateState>): boolean {
    return answer.ok && answer.value.current.includes('-');
}

/**
 * An install of a beta that never chose a channel follows the betas: the stable feed holds no
 * beta, and before the first stable it holds nothing at all. The choice is written once, as if
 * the person had made it, so the stable that later reaches a beta keeps it on the betas until the
 * person picks stable.
 */
export function useInstallChannel(writePreference: WritePreference): void {
    useEffect(() => {
        let live = true;

        fireAndForget(
            bridge.update.state().then((answer) => {
                const chosen = readAppPreferences()['updates.channel'] !== undefined;

                if (live && !chosen && runsABeta(answer)) {
                    writePreference('updates.channel', 'beta');
                }
            }),
        );

        return () => {
            live = false;
        };
    }, [writePreference]);
}
