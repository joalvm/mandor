import type { ScriptVariablesPlace } from '@mandor/host';

/**
 * The `onResponse` chains still running, by the place whose values they may set. A send waits for
 * those of its place before it reads them: without it, the one sent right after a login would go
 * with `{{token}}` as text, because the script that keeps the token is still running.
 */
export type ResponsesInFlight = {
    /** Counts a chain until it ends, however it ends. */
    track: (place: ScriptVariablesPlace, run: Promise<unknown>) => void;
    /** Waits for the chains of the place, `withinMs` at the most, or until `signal` cuts it. */
    settled: (place: ScriptVariablesPlace, withinMs: number, signal: AbortSignal) => Promise<void>;
};

function keyOf({ origin, workspaceId, environmentId }: ScriptVariablesPlace): string {
    return JSON.stringify([origin, workspaceId, environmentId]);
}

/** Resolves once the signal is cut; `stop` lets go of the signal when nothing cut it. */
function cutBy(signal: AbortSignal): { cut: Promise<undefined>; stop: () => void } {
    const { promise, resolve } = Promise.withResolvers<undefined>();
    const onAbort = (): void => {
        resolve(undefined);
    };

    signal.addEventListener('abort', onAbort, { once: true });

    return {
        cut: promise,
        stop: () => {
            signal.removeEventListener('abort', onAbort);
        },
    };
}

export function responsesInFlight(): ResponsesInFlight {
    const running = new Map<string, Set<Promise<unknown>>>();

    function forget(key: string, run: Promise<unknown>): void {
        const runs = running.get(key);

        runs?.delete(run);

        if (runs?.size === 0) {
            running.delete(key);
        }
    }

    return {
        track: (place, run) => {
            const key = keyOf(place);
            const runs = running.get(key) ?? new Set();

            runs.add(run);
            running.set(key, runs);
            // Deleted by identity: another chain of the same place stays counted.
            void run.then(
                () => {
                    forget(key, run);
                },
                () => {
                    forget(key, run);
                },
            );
        },
        settled: async (place, withinMs, signal) => {
            const runs = [...(running.get(keyOf(place)) ?? [])];

            if (runs.length === 0 || signal.aborted) {
                return;
            }

            const { cut, stop } = cutBy(AbortSignal.any([signal, AbortSignal.timeout(withinMs)]));

            try {
                await Promise.race([Promise.allSettled(runs), cut]);
            } finally {
                stop();
            }
        },
    };
}
