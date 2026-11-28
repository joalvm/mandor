type MenuShortcutProps = { children: string };

/** The keys that run the command, written by the caller and pinned to the far edge of the line. */
export function MenuShortcut({ children }: MenuShortcutProps) {
    return (
        <span className="ms-auto shrink-0 text-xs text-text-secondary" data-part="menu-shortcut">
            {children}
        </span>
    );
}
