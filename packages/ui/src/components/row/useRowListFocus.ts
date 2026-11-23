import {
    useLayoutEffect,
    useRef,
    type FocusEvent,
    type KeyboardEvent,
    type RefObject,
} from 'react';

import { walkOptions } from './walk-options.js';

type RowListReach = {
    /** How many rows the whole list has, when only part of them is in the DOM. */
    count?: number | undefined;
    /** Brings a row that is not drawn into the DOM, so Home and End reach the ends of a long list. */
    scrollTo?: ((index: number) => void) | undefined;
};

type RowListFocus = {
    list: RefObject<HTMLDivElement | null>;
    onFocus: (event: FocusEvent<HTMLDivElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/** Each key that goes to an end of the list: where it stands among the rows drawn, and in the list. */
const ENDS: ReadonlyMap<string, { drawn: number; index: (count: number) => number }> = new Map([
    ['End', { drawn: -1, index: (count: number) => count - 1 }],
    ['Home', { drawn: 0, index: () => 0 }],
]);

/** The rows of the list as drawn. */
function optionsIn(list: HTMLElement): HTMLElement[] {
    return [...list.querySelectorAll<HTMLElement>('[role="option"]')];
}

/** The row the tabulator stops at: the one in focus, the one taken, the last it stopped at, or the first. */
function stopOf(options: readonly HTMLElement[]): HTMLElement | undefined {
    return (
        options.find((option) => option === document.activeElement) ??
        options.find((option) => option.getAttribute('aria-selected') === 'true') ??
        options.find((option) => option.tabIndex === 0) ??
        options[0]
    );
}

function setStop(options: readonly HTMLElement[], stop: HTMLElement | undefined): void {
    for (const option of options) {
        option.tabIndex = option === stop ? 0 : -1;
    }
}

/**
 * The one stop of the tabulator a list of rows has, and the walk among them. Measured after every
 * draw, because the rows a long list draws change as it scrolls. A row in focus that leaves the DOM
 * hands the focus to a row still drawn, with no jump of the scroll under whoever is reading.
 */
export function useRowListFocus({ count, scrollTo }: RowListReach): RowListFocus {
    const list = useRef<HTMLDivElement>(null);
    const focused = useRef<HTMLElement | null>(null);
    const end = useRef<number | null>(null);

    useLayoutEffect(() => {
        const root = list.current;

        if (root === null) {
            return;
        }

        const options = optionsIn(root);
        const lost =
            focused.current?.isConnected === false && document.activeElement === document.body;
        const stop = end.current === null ? stopOf(options) : options.at(end.current);

        setStop(options, stop);

        if (lost || end.current !== null) {
            stop?.focus({ preventScroll: lost });
        }

        end.current = null;
    });

    function onFocus(event: FocusEvent<HTMLDivElement>): void {
        if (event.target.getAttribute('role') !== 'option') {
            return;
        }

        focused.current = event.target;
        setStop(optionsIn(event.currentTarget), event.target);
    }

    /**
     * Keys pressed on a row of the list as drawn. What a row opens in a portal —the dialog of its
     * settings— hands its keys to the list through React too, and Home and End there are the
     * field's.
     */
    function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
        if (!optionsIn(event.currentTarget).some((option) => option === event.target)) {
            return;
        }

        walkOptions(event);

        const wanted = ENDS.get(event.key);

        if (wanted === undefined || scrollTo === undefined || count === undefined) {
            return;
        }

        end.current = wanted.drawn;
        scrollTo(wanted.index(count));
    }

    return { list, onFocus, onKeyDown };
}
