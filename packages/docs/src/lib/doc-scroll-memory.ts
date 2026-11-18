/**
 * Where each tab had the page scrolled to. Switching sides unmounts the page and mounts it
 * again, and a page that came back at the top would throw away the place somebody was reading
 * — after one glance at the markdown, which is exactly when losing it hurts most.
 *
 * It is a map of the module and not of the store because it is written on every wheel tick.
 * Nothing draws from it, so a store entry would only be a render of the whole tab per tick.
 */
const TOPS = new Map<string, number>();

export function rememberDocTop(tabId: string, top: number): void {
    TOPS.set(tabId, top);
}

/** Where the page of a tab was, and the top of it for a tab nobody has scrolled yet. */
export function rememberedDocTop(tabId: string): number {
    return TOPS.get(tabId) ?? 0;
}

/** Lets go of one tab, which the window says when the tab leaves it. */
export function forgetDocTop(tabId: string): void {
    TOPS.delete(tabId);
}
