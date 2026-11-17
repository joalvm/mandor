import { cspNonce } from './csp-nonce.js';

/** The one form of `createElement` the wrapper stands in for: by name, as every writer calls it. */
type CreatesElements = {
    createElement: (tagName: string, options?: ElementCreationOptions) => HTMLElement;
};

const signed = new WeakSet<Document>();

/** Signs a style element with the nonce of the window, when the window declares one. */
function signStyle(element: HTMLElement): void {
    const nonce = element instanceof HTMLStyleElement ? cspNonce() : '';

    if (nonce !== '') {
        element.setAttribute('nonce', nonce);
    }
}

/**
 * The editor writes its rules into `<style>` elements it creates at runtime, and so does an open
 * menu or dialog, to lock the scroll of the window under it. The policy of a packaged window runs
 * a style element only when it carries the nonce the window was served with, and neither of them
 * takes one, so the document signs every style element it creates from here on.
 *
 * A window calls this before it draws anything: a sheet written before the call goes unsigned. The
 * nonce is read when a style element is created, so a window declares it whenever it likes, and
 * every other element goes by without a lookup.
 */
export function signCreatedStyles(): void {
    if (signed.has(document)) {
        return;
    }

    const page: CreatesElements = document;
    const create = page.createElement.bind(document);

    signed.add(document);
    page.createElement = (tagName, options) => {
        const element = create(tagName, options);

        signStyle(element);

        return element;
    };
}
