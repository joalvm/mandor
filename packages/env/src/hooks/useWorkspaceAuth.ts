import type { ErrorCode } from '@mandor/ipc';
import type { AuthConfig } from '@mandor/schema';
import { bridge, createPendingWrites, fireAndForget } from '@mandor/shell';
import { useEffect, useRef, useState } from 'react';

export type WorkspaceAuth = {
    /** The auth the workspace file carries, null while it names none or has not been read. */
    auth: AuthConfig | null;
    /**
     * Puts the next value on disk once the typing stops. A refusal puts the previous one back
     * and hands the code over to be told as a toast.
     */
    setAuth: (auth: AuthConfig | null, onError: (code: ErrorCode) => void) => void;
};

type AuthWrite = {
    auth: AuthConfig | null;
    onWritten: () => void;
    onRefused: (code: ErrorCode) => void;
};

// In the module and not in the hook: closing the dialog right after the last keystroke must not
// be what loses the write.
const PENDING = createPendingWrites<string, AuthWrite>(async (workspaceId, write) => {
    const result = await bridge.auth.write({ workspaceId, auth: write.auth });

    if (result.ok) {
        write.onWritten();

        return;
    }

    write.onRefused(result.error.code);
});

/** An auth as it stands on screen, with the workspace it belongs to. */
type HeldAuth = { auth: AuthConfig | null; workspaceId: string };

/**
 * Reads and writes the auth of one workspace through the bridge. What is held for another
 * workspace is never shown, so neither a switch nor a refusal that lands after it mixes them.
 */
export function useWorkspaceAuth(workspaceId: string | null): WorkspaceAuth {
    const [held, setHeld] = useState<HeldAuth | null>(null);
    const written = useRef<AuthConfig | null>(null);
    const auth = held !== null && held.workspaceId === workspaceId ? held.auth : null;

    useEffect(() => {
        let live = true;

        if (workspaceId === null) {
            return undefined;
        }

        fireAndForget(
            bridge.auth.read({ workspaceId }).then((result) => {
                if (!live) {
                    return;
                }

                const fromDisk = result.ok ? result.value.auth : null;

                written.current = fromDisk;
                setHeld({ auth: fromDisk, workspaceId });
            }),
        );

        return () => {
            live = false;
        };
    }, [workspaceId]);

    function setAuth(next: AuthConfig | null, onError: (code: ErrorCode) => void): void {
        if (workspaceId === null) {
            return;
        }

        const before = written.current;

        setHeld({ auth: next, workspaceId });
        // A refusal puts the workspace back as it is on disk and hands the code over for a toast.
        PENDING.schedule(workspaceId, {
            auth: next,
            onWritten: () => {
                written.current = next;
            },
            onRefused: (code) => {
                written.current = before;
                setHeld({ auth: before, workspaceId });
                onError(code);
            },
        });
    }

    return { auth, setAuth };
}
