import { type KeyboardEvent, useMemo, useState } from 'react';

import type { SuggestOption } from '@mandor/ui';
import { openVariable, type VariableScope } from '@mandor/vars';

import { steppedMatch } from '../lib/stepped-match.js';
import { variableHints } from '../lib/variable-hints.js';
import { declaredNames } from '../lib/window-scope.js';
import { variableMatches } from '../lib/variable-matches.js';

type VariableSuggestionsInput = {
    /**
     * Where the last edit left the caret, so a token closed in advance still asks for a name;
     * null while nothing is being written, because a caret that only landed inside a token
     * wrote nothing to suggest for.
     */
    caret: number | null;
    /** Closes the token the name completes in the field, and reports the text it left. */
    complete: (name: string) => void;
    /** What the field resolves against: its names are the ones it suggests, strongest first. */
    scope: VariableScope;
    value: string;
};

export type VariableSuggestions = {
    /** The name the keyboard is on: the first match, or the one the pointer moved to. */
    active: string | null;
    /** One list entry per name still writable, with the hint it may show. */
    options: readonly SuggestOption[];
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    open: boolean;
    pick: (name: string) => void;
    /** The pointer joins the keyboard: an option under it becomes the active one. */
    setActive: (name: string) => void;
};

/**
 * The state of the name being written: the matches it could still become, which one the
 * keyboard is on, and the keys that move it, close it or settle it. A dismissed query stays
 * dismissed until the query changes or the writing stops — Escape must not be undone by a
 * rerender, and must not silence the same name written again later.
 */
export function useVariableSuggestions({
    caret,
    complete,
    scope,
    value,
}: VariableSuggestionsInput): VariableSuggestions {
    const [activeName, setActiveName] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState<string | null>(null);

    const names = useMemo(() => declaredNames(scope), [scope]);
    const query = caret === null ? null : openVariable(value, caret);
    const matches = variableMatches(query, names);
    const options = useMemo(() => variableHints(scope, matches), [scope, matches]);
    const active =
        activeName !== null && matches.includes(activeName) ? activeName : (matches[0] ?? null);
    const open = query !== null && dismissed !== query && matches.length > 0;

    if (query === null && dismissed !== null) {
        setDismissed(null);
    }

    function dismiss(): void {
        if (query !== null) {
            setDismissed(query);
        }
    }

    function stepBy(step: number): (event: KeyboardEvent<HTMLElement>) => void {
        return (event) => {
            event.preventDefault();
            setActiveName(steppedMatch(matches, active, step));
        };
    }

    /** Enter is the list's while it hangs: it takes the match the keyboard is on, if any. */
    function take(event: KeyboardEvent<HTMLElement>): void {
        event.preventDefault();

        if (active !== null) {
            complete(active);
            dismiss();
        }
    }

    function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
        const answer = new Map([
            ['Escape', dismiss],
            ['ArrowDown', stepBy(1)],
            ['ArrowUp', stepBy(-1)],
            ['Enter', take],
        ]).get(event.key);

        if (!open || answer === undefined) {
            return;
        }

        answer(event);
    }

    function pick(name: string): void {
        setActiveName(name);
        complete(name);
        dismiss();
    }

    return { active, onKeyDown, open, options, pick, setActive: setActiveName };
}
