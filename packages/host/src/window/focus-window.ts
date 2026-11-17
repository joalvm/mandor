/** The slice of a `BrowserWindow` that is needed to bring it to the front. */
export type FocusTarget = {
    focus(): void;
    isDestroyed(): boolean;
    isMinimized(): boolean;
    restore(): void;
};

/** Brings a window back to the front, restored if it was minimized; a destroyed one is left alone. */
export function focusWindow(window: FocusTarget): void {
    if (window.isDestroyed()) {
        return;
    }

    if (window.isMinimized()) {
        window.restore();
    }

    window.focus();
}
