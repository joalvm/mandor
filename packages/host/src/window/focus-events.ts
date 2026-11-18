/** The slice of a `BrowserWindow` the focus watcher needs: any event, by its plain name. */
export type FocusableWindow = {
    on(event: string, listener: () => void): void;
};

/**
 * Announces every time the window takes the focus. A person who comes back to the app is
 * about to look at it, so it is the best moment to find out what the remote did meanwhile.
 *
 * The listener lives on the window, so it dies with it; there is nothing to unsubscribe.
 */
export function watchFocusEvents(window: FocusableWindow, notify: () => void): void {
    window.on('focus', notify);
}
