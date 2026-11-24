import type { PointerEvent } from 'react';

/** A move of the pointer as the handler reads it: nothing but the target. */
export function event(target: Element): Pick<PointerEvent<HTMLElement>, 'target'> {
    return { target };
}

/** A painted variable token, on the page for a pointer to come over. */
export function token(name: string): HTMLElement {
    const node = document.createElement('span');

    node.dataset['variable'] = name;
    document.body.append(node);

    return node;
}
