import { arrowStep, dividerOrientation } from '@mandor/ui';

import { MIN_SHARE, WHOLE, type Sash } from './grid-sashes.js';

/** How much of its axis one arrow key hands over, and how much of it with shift held. */
const STEP = 2;

const LARGE_STEP = 10;

/** Where the view keeps its separators. The panels around the grid have their own, and they
 * are not groups. */
const SASHES = '.dv-grid-view .dv-sash';

type Resize = (path: number[], index: number, delta: number) => void;

function undone(): void {
    // The separator was never there to undo.
}

function labelled(node: HTMLElement, sash: Sash, label: string): void {
    node.setAttribute('role', 'separator');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', label);
    node.setAttribute('aria-orientation', dividerOrientation(sash.axis));
    node.setAttribute('aria-valuemin', String(MIN_SHARE));
    node.setAttribute('aria-valuemax', String(WHOLE - MIN_SHARE));
    node.setAttribute('aria-valuenow', String(Math.round(sash.sizes[sash.index] ?? 0)));
    node.dataset['focusInset'] = '';
}

function decorated(node: HTMLElement, sash: Sash, onResize: Resize, label: string): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
        const direction = arrowStep(event.key, sash.axis);

        if (direction === 0) {
            return;
        }

        event.preventDefault();
        onResize(sash.path, sash.index, (event.shiftKey ? LARGE_STEP : STEP) * direction);
    };

    labelled(node, sash, label);
    node.addEventListener('keydown', onKeyDown);

    return () => {
        node.removeEventListener('keydown', onKeyDown);
    };
}

/**
 * Gives the separators of the view a keyboard and a name, and answers with the way to take them
 * back off.
 *
 * The view draws them and never says which is which, so they are paired by position: both this
 * list and the document walk the tree the same way, a branch before the branches under it. That
 * holds because a split of the same axis is never nested — the layout is built that way — so
 * there is exactly one separator in the document for each one here, in the same order.
 */
export function sashKeysAttached(
    root: HTMLElement | null,
    sashes: readonly Sash[],
    onResize: Resize,
    label: string,
): () => void {
    const nodes = [...(root?.querySelectorAll<HTMLElement>(SASHES) ?? [])];
    const undo = sashes.map((sash, index) => {
        const node = nodes[index];

        return node === undefined ? undone : decorated(node, sash, onResize, label);
    });

    return () => {
        for (const each of undo) {
            each();
        }
    };
}
