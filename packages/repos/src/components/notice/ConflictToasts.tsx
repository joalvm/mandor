import { useConflictToast } from '../../hooks/useConflictToast.js';

/** Speaks the clashes main keeps. Mounted once by the window, inside its toast provider. */
export function ConflictToasts() {
    useConflictToast();

    return null;
}
