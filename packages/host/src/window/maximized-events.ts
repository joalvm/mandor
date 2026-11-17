import type { BrowserWindow } from 'electron';

/**
 * The slice of a `BrowserWindow` the maximized watcher needs, named structurally so a plain
 * node test can stand in for it. The event name is a plain string because a `BrowserWindow`
 * declares its events as overloads and satisfies no narrower shape.
 */
export type WatchableWindow = Pick<BrowserWindow, 'isMaximized'> & {
    on(event: string, listener: () => void): void;
};

/**
 * Announces the maximized state of the window every time it changes. Entering full screen is
 * part of the watch: there the system takes over the chrome as well, and the maximize icon the
 * renderer draws has to say the same thing the window does.
 *
 * The listeners live on the window, so they die with it; there is nothing to unsubscribe.
 */
export function watchMaximizedEvents(
    window: WatchableWindow,
    notify: (maximized: boolean) => void,
): void {
    const announce = (): void => {
        notify(window.isMaximized());
    };

    window.on('maximize', announce);
    window.on('unmaximize', announce);
    window.on('enter-full-screen', announce);
}
