import { useState } from 'react';

type FocusState = { claim: boolean; id: string | null };

/**
 * Which line of a tree holds the focus, and whether it still has to take it.
 *
 * Focus arrives two ways. A click or a tab puts it on a line by itself, and the tree only writes
 * down where it went. An arrow decides where it goes before that line may even be drawn — the
 * window of a long tree scrolls to it first — so the move is kept as a claim, and the line takes
 * the focus the moment it is on screen.
 */
export type TreeFocus = {
    /** The keyboard moved here: the line takes the focus as soon as it is drawn. */
    claim: (id: string) => void;
    /** The line claimed took the focus, and the claim is spent. */
    claimed: () => void;
    id: string | null;
    pending: boolean;
    /** The focus got here by itself, and only has to be written down. */
    take: (id: string) => void;
};

export function useTreeFocus(): TreeFocus {
    const [state, setState] = useState<FocusState>({ claim: false, id: null });

    return {
        claim: (id) => {
            setState({ claim: true, id });
        },
        claimed: () => {
            setState((current) => (current.claim ? { ...current, claim: false } : current));
        },
        id: state.id,
        pending: state.claim,
        take: (id) => {
            setState((current) => (current.id === id ? current : { claim: false, id }));
        },
    };
}
