import { useEffect, useState } from 'react';

/** Long enough for a word to be finished, short enough to still read as the answer to it. */
const PAUSE_MS = 300;

type Settled<T> = { owner: string; value: T };

/**
 * A value as it was once it stopped changing for a pause, for what is read off a text while it
 * is typed: reading a text of megabytes at every key lagged the typing. The first value counts at
 * once, and so does the value of another owner, so a different document never shows what was read
 * of the last one.
 */
export function useSettledValue<T>(value: T, owner: string): T {
    const [settled, setSettled] = useState<Settled<T>>({ owner, value });
    const moved = settled.owner !== owner;

    if (moved) {
        setSettled({ owner, value });
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSettled({ owner, value });
        }, PAUSE_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [owner, value]);

    return moved ? value : settled.value;
}
