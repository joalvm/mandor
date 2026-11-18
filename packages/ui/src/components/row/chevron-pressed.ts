import type { TreeLineScope } from '../tree/tree-scope.js';

/**
 * Whether a click landed on the mark of a line that has something to fold. Such a click folds the
 * line or opens it again, and never activates it: pressing the mark is not pressing the line.
 */
export function chevronPressed(target: EventTarget, line: TreeLineScope): boolean {
    return (
        line.chevrons &&
        line.expanded !== undefined &&
        target instanceof Element &&
        target.closest('[data-part="row-gutter"]') !== null
    );
}
