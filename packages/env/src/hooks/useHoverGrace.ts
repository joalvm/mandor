import type { EditorVariableHover, PopoverAnchor } from '@mandor/ui';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

/** How long the pointer may be off the token before the hover believes it left. */
const CLOSE_DELAY_MS = 250;

/** Who shows a popover of a variable, by the way to close it. */
type Owner = { close: () => void };

/** The one popover of a variable the window shows: a field or editor opening one closes it. */
let shown: Owner | null = null;

/** Where a press still belongs to the popover: inside its own panel. */
const PANEL = '[data-part="variable-popover"]';

/**
 * Closes the popover on a press anywhere outside it and when the window loses the focus, as
 * any popover does. The press is heard before anything under it can swallow it: the code
 * editor keeps its own presses to itself.
 */
function useDismissOutside(open: boolean, dismiss: () => void): void {
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function onPress(event: PointerEvent): void {
            if (event.target instanceof Element && event.target.closest(PANEL) !== null) {
                return;
            }

            dismiss();
        }

        window.addEventListener('pointerdown', onPress, true);
        window.addEventListener('blur', dismiss);

        return () => {
            window.removeEventListener('pointerdown', onPress, true);
            window.removeEventListener('blur', dismiss);
        };
    }, [open, dismiss]);
}

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
 * The window shows one at a time: opening one closes the one before, wherever it was.
 */
export function useHoverGrace(): { controls: GraceControls; hover: HoverGrace } {
    const tokenRef = useRef<HoverToken | null>(null);
    const timerRef = useRef<number | null>(null);
    const heldRef = useRef(false);
    const owner = useRef<Owner>({ close: () => undefined });
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
        if (next !== null && shown !== owner.current) {
            shown?.close();
            shown = owner.current;
        }

        if (next === null && shown === owner.current) {
            shown = null;
        }

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

    useEffect(() => {
        const self = owner.current;

        self.close = close;

        return () => {
            if (shown === self) {
                shown = null;
            }
        };
    }, [close]);

    useDismissOutside(token !== null, close);

    return {
        controls,
        hover: { anchor, cancel, close, hold, schedule, token },
    };
}
