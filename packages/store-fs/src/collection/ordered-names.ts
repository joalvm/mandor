import type { CollectionPlacement } from './collection-placement.js';

/**
 * The same order with one name replaced where it stood, or added at the end when the order
 * never mentioned it. A rename keeps the position: what changed is the name, not the place.
 */
export function orderRenaming(order: readonly string[], from: string, to: string): string[] {
    if (!order.includes(from)) {
        return [...order, to];
    }

    return order.map((name) => (name === from ? to : name));
}

export function orderWithout(order: readonly string[], name: string): string[] {
    return order.filter((entry) => entry !== name);
}

/** Whatever arrives goes last: where it really belongs is decided afterwards, by dragging it. */
export function orderWith(order: readonly string[], name: string): string[] {
    return [...order, name];
}

/**
 * The same names with one of them taken out and put back above another. A sibling the order
 * never mentioned is the end of the list, which is where a node the order forgot already sits.
 */
export function orderPlacing(order: readonly string[], placement: CollectionPlacement): string[] {
    const rest = orderWithout(order, placement.name);
    const at = placement.before === null ? -1 : rest.indexOf(placement.before);

    if (at < 0) {
        return [...rest, placement.name];
    }

    return [...rest.slice(0, at), placement.name, ...rest.slice(at)];
}
