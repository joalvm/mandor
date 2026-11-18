import { type KeyboardEvent, useState } from 'react';

import { headerMatches } from '../../lib/header-matches.js';
import { steppedMatch } from '../../lib/stepped-match.js';

type KeySuggestionsInput = {
    /** Writes the picked name into the cell, the way the cell writes what its keys type. */
    complete: (name: string) => void;
    /** Whether the cell holds the focus: a list hangs only from a cell being written into. */
    focused: boolean;
    /** The names the table was given to suggest; nothing to suggest is no list at all. */
    suggestions: readonly string[] | undefined;
    /** What the cell says now: the query the list narrows by. */
    value: string;
};

export type KeySuggestions = {
    /** The name the keyboard is on: the first match, or the one the pointer moved to. */
    active: string | null;
    /** Whether the list hangs now: focused, with matches, and not sent away for this query. */
    open: boolean;
    /** The keys the list answers while it is open; `true` means the grid must not walk. */
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
    options: readonly string[];
    pick: (name: string) => void;
    /** The pointer joins the keyboard: the option under it becomes the active one. */
    setActive: (name: string) => void;
};

/**
 * The state of the key being written: which of the names given still fit, which one the
 * keyboard is on, and the keys that settle or close it. A query sent away stays sent away
 * until the query changes — Escape must not be undone by a rerender.
 */
export function useKeySuggestions({
    complete,
    focused,
    suggestions,
    value,
}: KeySuggestionsInput): KeySuggestions | null {
    const [activeName, setActiveName] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState<string | null>(null);

    if (suggestions === undefined || !focused) {
        return null;
    }

    const matches = headerMatches(value, suggestions);
    const active =
        activeName !== null && matches.includes(activeName) ? activeName : (matches[0] ?? null);
    const open = dismissed !== value.trim() && matches.length > 0;

    function dismiss(query: string): void {
        setDismissed(query);
    }

    function close(): boolean {
        dismiss(value.trim());

        return true;
    }

    function stepBy(step: number): (event: KeyboardEvent<HTMLElement>) => boolean {
        return (event) => {
            event.preventDefault();
            setActiveName(steppedMatch(matches, active, step));

            return true;
        };
    }

    /** Enter takes the match the keyboard is on; with none, the key is the cell's. */
    function take(event: KeyboardEvent<HTMLElement>): boolean {
        if (active === null) {
            return false;
        }

        event.preventDefault();
        pick(active);

        return true;
    }

    function onKeyDown(event: KeyboardEvent<HTMLElement>): boolean {
        const answer = new Map([
            ['Escape', close],
            ['ArrowDown', stepBy(1)],
            ['ArrowUp', stepBy(-1)],
            ['Enter', take],
        ]).get(event.key);

        if (!open || answer === undefined) {
            return false;
        }

        return answer(event);
    }

    function pick(name: string): void {
        setActiveName(name);
        complete(name);
        // The query is the name now: the list stays sent away until the writing moves again.
        dismiss(name);
    }

    return { active, onKeyDown, open, options: matches, pick, setActive: setActiveName };
}
