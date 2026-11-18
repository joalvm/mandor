import type { EditorVariableHover, PopoverAnchor } from '@mandor/ui';
import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';

/** How long the pointer may be off the token before the hover believes it left. */
const CLOSE_DELAY_MS = 250;

/** The variable token the pointer is on, with the rect it stood in when it was found. */
type HoverToken = EditorVariableHover;

/** What a popover hangs from: the token it speaks for, where it stood, and the grace around it. */
export type HoverGrace = {
    /** The rect of the token, read when the popover opens. */
    anchor: RefObject<PopoverAnchor>;
    /** The pointer is back on the token or on the popover: the grace has nothing to wait for. */
    cancel: () => void;
    /** The popover is gone on its own: forget the token now. */
    close: () => void;
    /**
     * The popover has the focus: someone is typing in it, and the pointer is free to go. While
     * held nothing starts a close and no other token takes the popover; the focus leaving lets go.
     */
    hold: (held: boolean) => void;
    /** The pointer left for the gap: the close waits, so the popover can be reached. */
    schedule: () => void;
    token: HoverToken | null;
};

/** What the finder of the token drives the grace with; the popover never sees it. */
type GraceControls = {
    /** Runs once the wait is over, unless something else takes the one timer first. */
    after: (delay: number, run: () => void) => void;
    held: () => boolean;
    show: (next: HoverToken) => void;
    /** A popover is up already, for some token. */
    showing: () => boolean;
};

/**
 * The grace a variable popover lives by, wherever its token is found: the pointer must be able
 * to cross from the token to the popover without the popover dying on the way, and typing in it
 * keeps it. A field and a code editor find their tokens differently and share all of this.
 */
export function useHoverGrace(): { controls: GraceControls; hover: HoverGrace } {
    const tokenRef = useRef<HoverToken | null>(null);
    const timerRef = useRef<number | null>(null);
    const heldRef = useRef(false);
    const [token, setToken] = useState<HoverToken | null>(null);
    const anchor = useRef<PopoverAnchor>({
        getBoundingClientRect: () => tokenRef.current?.rect ?? new DOMRect(),
    });

    const cancel = useCallback((): void => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const show = useCallback((next: HoverToken | null): void => {
        tokenRef.current = next;
        setToken(next);
    }, []);

    const after = useCallback(
        (delay: number, run: () => void): void => {
            cancel();
            timerRef.current = window.setTimeout(() => {
                timerRef.current = null;
                run();
            }, delay);
        },
        [cancel],
    );

    const controls = useMemo<GraceControls>(
        () => ({
            after,
            held: () => heldRef.current,
            show,
            showing: () => tokenRef.current !== null,
        }),
        [after, show],
    );

    const hold = useCallback(
        (held: boolean): void => {
            heldRef.current = held;

            if (held) {
                cancel();
            }
        },
        [cancel],
    );

    const schedule = useCallback((): void => {
        if (heldRef.current) {
            return;
        }

        after(CLOSE_DELAY_MS, () => {
            show(null);
        });
    }, [after, show]);

    const close = useCallback((): void => {
        cancel();
        heldRef.current = false;
        show(null);
    }, [cancel, show]);

    return {
        controls,
        hover: { anchor, cancel, close, hold, schedule, token },
    };
}
