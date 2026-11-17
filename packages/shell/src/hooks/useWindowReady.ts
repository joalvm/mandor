import { useEffect } from 'react';

import { bridge } from '../bridge.js';
import { fireAndForget } from '../fire-and-forget.js';
import { useShellStore } from './useShellStore.js';

/**
 * Tells main, once, that the window has drawn what it restored: an origin is adopted and two
 * frames have gone by since, which is the first time the person could see their tabs. Main
 * writes the moment in the log of the start. A window that is reloaded mounts this again and
 * says it again, and main keeps that apart from the start.
 */
export function useWindowReady(): void {
    const adopted = useShellStore((state) => state.activeOriginId !== null);

    useEffect(() => {
        if (!adopted) {
            return undefined;
        }

        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                fireAndForget(bridge.window.ready());
            });
        });

        return () => {
            cancelAnimationFrame(frame);
        };
    }, [adopted]);
}
