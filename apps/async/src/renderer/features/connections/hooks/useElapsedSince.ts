import { useEffect, useState } from 'react';

const TICK = 1000;

/**
 * How long ago a moment was, renewed every second while there is one. Nothing is counted, and no
 * clock runs, while there is no moment: a closed connection costs nothing.
 */
export function useElapsedSince(since: number | undefined): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (since === undefined) {
            return undefined;
        }

        const timer = setInterval(() => {
            setNow(Date.now());
        }, TICK);

        return () => {
            clearInterval(timer);
        };
    }, [since]);

    return since === undefined ? 0 : Math.max(0, now - since);
}
