import { unpackagedVariable } from '../runtime/unpackaged-variable.js';

/** Set by the runs that stand in for the user, and by nothing else. */
const STAND_IN = 'MANDOR_SAVE_DIR';

/**
 * The folder a save answers with when nobody is there to pick one: an end-to-end run names it and
 * the dialogs answer at once, into the folder that run owns, without showing anything. Empty is
 * the same as unset, and an installed app never has one.
 */
export function saveStandIn(): string | null {
    const folder = unpackagedVariable(STAND_IN);

    if (folder === undefined || folder === '') {
        return null;
    }

    return folder;
}
