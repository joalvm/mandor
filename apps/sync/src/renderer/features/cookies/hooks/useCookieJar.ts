import type { CookieRow, Empty, Result } from '@mandor/ipc';
import { createLatestRead, fireAndForget, useFailureToast } from '@mandor/shell';
import { useEffect, useEffectEvent, useState } from 'react';

import { syncBridge } from '../../../app/sync-bridge.js';

type JarPlace = { environmentId: string | null; workspaceId: string };

type CookieJar = {
    clear: () => Promise<void>;
    /** What the jar holds, or `null` until main has answered the first time. */
    cookies: readonly CookieRow[] | null;
    remove: (cookie: CookieRow) => Promise<void>;
    save: (cookie: CookieRow, value: string) => Promise<void>;
};

/**
 * The jar of one environment as the dialog shows it. Every write goes to main first and the list
 * is read again once main says yes, so the table never runs ahead of the disk. A call that fails
 * says why as a notice and leaves every row where it was.
 */
export function useCookieJar({ environmentId, workspaceId }: JarPlace): CookieJar {
    const notifyFailure = useFailureToast();
    const [cookies, setCookies] = useState<readonly CookieRow[] | null>(null);
    // A read of the place left behind, or one a later write overtook, never lands on the table.
    const [ask] = useState(createLatestRead);
    const place = { environmentId, workspaceId };
    const readOnOpen = useEffectEvent((): void => {
        fireAndForget(reload());
    });

    async function reload(): Promise<void> {
        const latest = ask();
        const result = await syncBridge.cookies.list(place);

        if (!latest()) {
            return;
        }

        if (result.ok) {
            setCookies(result.value.cookies);
        } else {
            notifyFailure(result.error.code);
        }
    }

    async function write(call: Promise<Result<Empty>>): Promise<void> {
        const result = await call;

        if (result.ok) {
            await reload();
        } else {
            notifyFailure(result.error.code);
        }
    }

    // The jar of a place is read when the dialog opens on it and again after each write.
    useEffect(() => {
        readOnOpen();
    }, [environmentId, workspaceId]);

    return {
        clear: () => write(syncBridge.cookies.clear(place)),
        cookies,
        remove: ({ domain, name, path }) =>
            write(syncBridge.cookies.delete({ ...place, domain, name, path })),
        save: ({ domain, name, path }, value) =>
            write(syncBridge.cookies.set({ ...place, domain, name, path, value })),
    };
}
