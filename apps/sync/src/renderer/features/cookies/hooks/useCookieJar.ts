import { useMessages } from '@mandor/i18n';
import type { CookieRow, Empty, Result } from '@mandor/ipc';
import { createLatestRead, fireAndForget, useFailureToast } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useEffect, useEffectEvent, useState } from 'react';

import { syncBridge } from '../../../app/sync-bridge.js';

type JarPlace = { environmentId: string | null; workspaceId: string };

/** What names one cookie of the jar. */
export type CookieIdentity = Pick<CookieRow, 'domain' | 'name' | 'path'>;

export type CookieJar = {
    clear: () => Promise<void>;
    /** Takes the cookies of one domain out of the jar. */
    clearDomain: (domain: string) => Promise<void>;
    /** What the jar holds, or `null` until main has answered the first time. */
    cookies: readonly CookieRow[] | null;
    /**
     * Writes a cookie from its line under a domain, over the one it was opened from if any.
     * Answers whether the jar kept it.
     */
    put: (domain: string, line: string, replaces?: CookieIdentity) => Promise<boolean>;
    remove: (cookie: CookieIdentity) => Promise<void>;
};

/**
 * The jar of one environment as the dialog shows it. Every write goes to main first and the list
 * is read again once main says yes, so the dialog never runs ahead of the disk. A call that fails
 * says why as a notice and leaves every cookie where it was; a line main cannot read as a cookie
 * of its domain says so, and the line stays as it was typed.
 */
export function useCookieJar({ environmentId, workspaceId }: JarPlace): CookieJar {
    const labels = useMessages('cookies');
    const notifyFailure = useFailureToast();
    const { notify } = useToast();
    const [cookies, setCookies] = useState<readonly CookieRow[] | null>(null);
    // A read of the place left behind, or one a later write overtook, never lands on the dialog.
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

    async function put(domain: string, line: string, replaces?: CookieIdentity): Promise<boolean> {
        const result = await syncBridge.cookies.set({ ...place, domain, line, replaces });

        if (result.ok) {
            await reload();

            return true;
        }

        if (result.error.code === 'bad-request') {
            notify({ title: labels('lineRefused', { domain }), tone: 'warning' });
        } else {
            notifyFailure(result.error.code);
        }

        return false;
    }

    // The jar of a place is read when the dialog opens on it and again after each write.
    useEffect(() => {
        readOnOpen();
    }, [environmentId, workspaceId]);

    return {
        clear: () => write(syncBridge.cookies.clear(place)),
        clearDomain: (domain) => write(syncBridge.cookies.clear({ ...place, domain })),
        cookies,
        put,
        remove: ({ domain, name, path }) =>
            write(syncBridge.cookies.delete({ ...place, domain, name, path })),
    };
}
