import { useEffect, useState } from 'react';

/** Delays short-lived pending signals so fast operations never flash. */
export function useDelayedFlag(active: boolean, delay = 400): boolean {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            setVisible(true);
        }, delay);

        // Lowered when the signal ends, so the next one waits its own delay before it shows.
        return () => {
            window.clearTimeout(timeout);
            setVisible(false);
        };
    }, [active, delay]);

    return active && visible;
}
