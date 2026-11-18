import { useCallback, useState } from 'react';

const KEPT = 20;

/**
 * What was run last, for as long as the window is open.
 *
 * Nothing of this is written down: a palette that remembers across restarts turns a list of what
 * the app can do into a list of what somebody did months ago.
 */
export function useRecentCommands(): [readonly string[], (id: string) => void] {
    const [recent, setRecent] = useState<readonly string[]>([]);

    const remember = useCallback((id: string) => {
        setRecent((current) => [id, ...current.filter((each) => each !== id)].slice(0, KEPT));
    }, []);

    return [recent, remember];
}
