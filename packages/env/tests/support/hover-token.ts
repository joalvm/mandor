import type { PointerEvent } from 'react';

/** jsdom has no pointer events to send; the handler reads nothing but the target. */
export function event(target: Element): PointerEvent<HTMLElement> {
    return { target } as unknown as PointerEvent<HTMLElement>;
}

/** A painted variable token, on the page for a pointer to come over. */
export function token(name: string): HTMLElement {
    const node = document.createElement('span');

    node.dataset['variable'] = name;
    document.body.append(node);

    return node;
}
