import { createStore } from 'zustand/vanilla';

/** The ways the halves of a request or a connection stand: side by side, or one over the other. */
export const PANE_LAYOUTS = ['vertical', 'horizontal'] as const;

export type PaneLayout = (typeof PANE_LAYOUTS)[number];

/**
 * How the two halves of a tab stand for each layout. Vertical sets them side by side while the
 * tab is wide enough to read both, and stacks them once it is not; horizontal always stacks them.
 */
export const PANE_DIRECTION = {
    horizontal: 'column',
    vertical: 'fit',
} as const satisfies Record<PaneLayout, 'column' | 'fit'>;

const PANE_LAYOUT_KEY = 'mandor.paneLayout';

const DEFAULT_LAYOUT: PaneLayout = 'vertical';

const OTHER: Readonly<Record<PaneLayout, PaneLayout>> = {
    horizontal: 'vertical',
    vertical: 'horizontal',
};

function isPaneLayout(value: unknown): value is PaneLayout {
    return PANE_LAYOUTS.some((layout) => layout === value);
}

/** The layout kept on this machine; one that is missing or unknown is the vertical one. */
export function readPaneLayout(): PaneLayout {
    try {
        const kept = window.localStorage.getItem(PANE_LAYOUT_KEY);

        return isPaneLayout(kept) ? kept : DEFAULT_LAYOUT;
    } catch {
        return DEFAULT_LAYOUT;
    }
}

// store-scope: window — how the halves stand is the person's, and a switch of origin keeps it.
export const paneLayoutStore = createStore<{ layout: PaneLayout }>(() => ({
    layout: readPaneLayout(),
}));

/** Turns every tab of the window to the other layout, and keeps it for the next time it opens. */
export function togglePaneLayout(): void {
    const layout = OTHER[paneLayoutStore.getState().layout];

    paneLayoutStore.setState({ layout });
    window.localStorage.setItem(PANE_LAYOUT_KEY, layout);
}
