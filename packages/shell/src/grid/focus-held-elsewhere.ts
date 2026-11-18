/**
 * Whether the focus stands on something of its own outside the grid —a line of the lateral, a
 * dialog, the bar of the title— and not on the grid or on nothing at all.
 */
export function focusHeldElsewhere(grid: HTMLElement | null): boolean {
    const active = document.activeElement;

    return active !== null && active !== document.body && grid?.contains(active) === false;
}

/**
 * Whether the focus already stands inside what a group shows —the first field of a tab that was
 * just opened, a field clicked into— and not on its strip or on the group itself.
 */
export function focusInsideContent(group: HTMLElement | undefined): boolean {
    const content = group?.querySelector('.dv-content-container');

    return content?.contains(document.activeElement) === true;
}
