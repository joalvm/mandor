/**
 * Where a shortcut listens. `window` steps aside while something is being typed, which is what
 * almost every shortcut wants; `editing` keeps working inside a text field, for the few that
 * belong to the field itself.
 */
type ShortcutScope = 'editing' | 'window';

/** One line of the table: what to run, which keys ask for it, and where they are heard. */
export type Shortcut = {
    combination: string;
    command: string;
    scope: ShortcutScope;
};

/**
 * The shortcuts the window is born with.
 *
 * They live together as data instead of spread through the code that runs them, so the whole
 * keyboard can be read at once and, later, handed to whoever wants to change it.
 *
 * `$mod` is `Ctrl` on Windows and Linux and `Cmd` on macOS, and the key is named by its code so
 * a keyboard layout cannot move it somewhere else.
 */
export const DEFAULT_SHORTCUTS: readonly Shortcut[] = [
    // The one shortcut that has to work from inside a text field: it is the way out of not
    // knowing the rest of them.
    { combination: '$mod+Shift+KeyP', command: 'shell.commandPalette', scope: 'editing' },
    { combination: '$mod+Shift+KeyF', command: 'workspace.search', scope: 'editing' },
    // The settings are where the editor's own options live, so they open from inside one too.
    { combination: '$mod+Comma', command: 'shell.openSettings', scope: 'editing' },
    { combination: '$mod+Backslash', command: 'group.splitRight', scope: 'window' },
    { combination: '$mod+Shift+Backslash', command: 'group.splitDown', scope: 'window' },
    { combination: '$mod+Shift+KeyW', command: 'group.close', scope: 'window' },
    { combination: '$mod+KeyM', command: 'group.toggleMaximized', scope: 'window' },
    // The console comes out from inside a field too: it is where a script that just ran wrote.
    { combination: '$mod+Shift+KeyY', command: 'shell.toggleConsole', scope: 'editing' },
    { combination: '$mod+Digit1', command: 'group.focus.1', scope: 'window' },
    { combination: '$mod+Digit2', command: 'group.focus.2', scope: 'window' },
    { combination: '$mod+Digit3', command: 'group.focus.3', scope: 'window' },
    { combination: '$mod+Digit4', command: 'group.focus.4', scope: 'window' },
    { combination: '$mod+Digit5', command: 'group.focus.5', scope: 'window' },
    { combination: '$mod+Digit6', command: 'group.focus.6', scope: 'window' },
    { combination: '$mod+Digit7', command: 'group.focus.7', scope: 'window' },
    { combination: '$mod+Digit8', command: 'group.focus.8', scope: 'window' },
    { combination: '$mod+Digit9', command: 'group.focus.9', scope: 'window' },
    { combination: '$mod+KeyW', command: 'tab.close', scope: 'window' },
    { combination: '$mod+Alt+KeyW', command: 'tab.closeOthers', scope: 'window' },
    { combination: '$mod+KeyK KeyU', command: 'tab.closeSaved', scope: 'window' },
    { combination: '$mod+KeyK $mod+KeyW', command: 'tab.closeAll', scope: 'window' },
    { combination: '$mod+KeyK Enter', command: 'tab.keepOpen', scope: 'window' },
    // One key per command: letting go of a pin is in the menu, the palette and the pin itself.
    { combination: '$mod+KeyK Shift+Enter', command: 'tab.pin', scope: 'window' },
    { combination: '$mod+Alt+ArrowRight', command: 'tab.moveAside', scope: 'window' },
    { combination: '$mod+Alt+Backslash', command: 'tab.openAside', scope: 'window' },
    { combination: '$mod+Shift+KeyT', command: 'tab.reopen', scope: 'window' },
    { combination: '$mod+Shift+KeyA', command: 'tab.search', scope: 'window' },
    // Going from tab to tab is not editing the field the focus is in, so it works from inside one.
    { combination: '$mod+PageDown', command: 'tab.next', scope: 'editing' },
    { combination: '$mod+PageUp', command: 'tab.previous', scope: 'editing' },
    // Control on every platform: Cmd+Tab belongs to macOS, which switches apps with it.
    { combination: 'Control+Tab', command: 'tab.recent', scope: 'editing' },
    { combination: 'Control+Shift+Tab', command: 'tab.recentBack', scope: 'editing' },
    { combination: '$mod+Shift+PageDown', command: 'tab.moveRight', scope: 'window' },
    { combination: '$mod+Shift+PageUp', command: 'tab.moveLeft', scope: 'window' },
];
