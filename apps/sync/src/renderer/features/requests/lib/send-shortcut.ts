/** Ctrl+Enter, or Cmd+Enter where the system has a Cmd: the keys that send. */
function isSendShortcut(event: { ctrlKey: boolean; key: string; metaKey: boolean }): boolean {
    return event.key === 'Enter' && (event.ctrlKey || event.metaKey);
}

/**
 * Ctrl+S, or Cmd+S where the system has a Cmd: the keys that put the draft on disk. The
 * browser would offer to save the page; the request is what is being saved here.
 */
function isSaveShortcut(event: { ctrlKey: boolean; key: string; metaKey: boolean }): boolean {
    return event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey);
}

/** The keys of the panel ask for one thing: the panel answers it in one place. */
export function keyIntent(
    event: { ctrlKey: boolean; key: string; metaKey: boolean; preventDefault(): void },
    actions: { save(): void; send(): void },
): void {
    if (isSaveShortcut(event)) {
        event.preventDefault();
        actions.save();

        return;
    }

    if (isSendShortcut(event)) {
        event.preventDefault();
        actions.send();
    }
}
