/**
 * One key press as `before-input-event` reports it, narrowed to what the shortcut predicate
 * reads. Everything else the event carries — code, location, the rest — is of no interest.
 */
export type ShortcutInput = {
    type: string;
    key: string;
    control: boolean;
    meta: boolean;
    alt: boolean;
    shift: boolean;
};

/**
 * The predicate every Electron app answers by: `F12` anywhere, `Cmd+Alt+I` on macOS and
 * `Ctrl+Shift+I` on Windows and Linux. Inventing another chord would only make the app harder
 * to reason about while a DevTools window is open.
 */
export function opensDevTools(input: ShortcutInput, platform: NodeJS.Platform): boolean {
    if (input.key === 'F12') {
        return true;
    }

    if (input.key.toLowerCase() !== 'i') {
        return false;
    }

    if (platform === 'darwin') {
        return input.meta && input.alt;
    }

    return input.control && input.shift;
}

/** The slice of `webContents` the watcher needs, named structurally so node can stand in. */
export type DevToolsSource = {
    on(
        event: string,
        listener: (event: { preventDefault: () => void }, input: ShortcutInput) => void,
    ): void;
    off(
        event: string,
        listener: (event: { preventDefault: () => void }, input: ShortcutInput) => void,
    ): void;
    toggleDevTools: () => void;
};

/**
 * Opens DevTools when the user asks for them, on every platform and in every mode: the
 * developer, not the build, decides whether they open. Only key presses count — without the
 * type guard `F12` would toggle twice, once for the press and once for the release.
 */
export function watchDevToolsShortcut(
    source: DevToolsSource,
    platform: NodeJS.Platform = process.platform,
): () => void {
    const listener = (event: { preventDefault: () => void }, input: ShortcutInput): void => {
        if (input.type !== 'keyDown' || !opensDevTools(input, platform)) {
            return;
        }

        event.preventDefault();
        source.toggleDevTools();
    };

    source.on('before-input-event', listener);

    return () => {
        source.off('before-input-event', listener);
    };
}
