import type { AuthTokenRequest, AuthTokenStatus, ErrorCode } from '@mandor/ipc';
import { bridge, fireAndForget } from '@mandor/shell';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

/** How long the typing has to stop before the state of the token is asked again. */
const QUIET = 250;

const NONE: AuthTokenStatus = { state: 'none', expiresAt: null };

export type TokenStatusView = {
    status: AuthTokenStatus;
    /** A token is being asked for; with a code flow, a person is at a browser. */
    busy: boolean;
    fetch: () => void;
    forget: () => void;
};

/**
 * The state of the token one level asks for, read through the bridge, with the two things a
 * person can do about it. The window never holds the token: it holds this state and nothing
 * else, and asks again whenever the level it describes changes.
 */
export function useTokenStatus(
    request: AuthTokenRequest,
    onError: (code: ErrorCode) => void,
): TokenStatusView {
    const [status, setStatus] = useState<AuthTokenStatus>(NONE);
    const [busy, setBusy] = useState(false);
    const mounted = useRef(true);
    const signature = JSON.stringify(request);
    // The level as it is when the typing stops, not as it was when the wait began.
    const ask = useEffectEvent(() => bridge.auth.tokenStatus(request));

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        let live = true;
        const timer = setTimeout(() => {
            fireAndForget(
                ask().then((result) => {
                    if (live && result.ok) {
                        setStatus(result.value);
                    }
                }),
            );
        }, QUIET);

        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [signature]);

    function fetch(): void {
        setBusy(true);
        fireAndForget(
            bridge.auth.tokenFetch(request).then((result) => {
                if (!mounted.current) {
                    return;
                }

                setBusy(false);

                if (result.ok) {
                    setStatus(result.value);
                } else {
                    onError(result.error.code);
                }
            }),
        );
    }

    function forget(): void {
        fireAndForget(
            bridge.auth.tokenForget(request).then((result) => {
                if (!mounted.current) {
                    return;
                }

                if (result.ok) {
                    setStatus(NONE);
                } else {
                    onError(result.error.code);
                }
            }),
        );
    }

    return { status, busy, fetch, forget };
}
