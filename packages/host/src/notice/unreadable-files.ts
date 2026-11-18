import type { LoadWarning } from '@mandor/store-fs';

import type { Logger } from '../log/create-logger.js';
import { activeOrigin } from '../origin/active-origin.js';
import type { NoticeOutbox } from './raise-notice.js';

/** What a handler that reads files needs to say that one could not be read. */
export type UnreadableDeps = {
    notices: NoticeOutbox;
    logger: Logger;
};

/** More names than this and the rest are only counted: a toast is not a directory listing. */
const NAMES_SHOWN = 5;

/** The files each outbox already told, by origin, with the name each one carries (`''` if none). */
const told = new WeakMap<NoticeOutbox, Map<string, Map<string, string>>>();

/**
 * What the toast lists: the names the unreadable files carry, each once. A file that carries none
 * has no name to list, so when any is left out, or there are too many, the list ends in `…`.
 */
function shown(known: ReadonlyMap<string, string>): string[] {
    const all = [...known.values()];
    const names = [...new Set(all.filter((name) => name !== ''))].sort();
    const hidden = names.length > NAMES_SHOWN || (names.length > 0 && all.includes(''));

    return hidden ? [...names.slice(0, NAMES_SHOWN), '…'] : names;
}

/** The files of the origin that are open now, which this outbox has already been told about. */
function knownOf(outbox: NoticeOutbox, origin: string): Map<string, string> {
    const byOrigin = told.get(outbox) ?? new Map<string, Map<string, string>>();
    const known = byOrigin.get(origin) ?? new Map<string, string>();

    byOrigin.set(origin, known);
    told.set(outbox, byOrigin);

    return known;
}

/** Opening an origin again is asking to be told again: what was told about it is forgotten. */
export function forgetUnreadable(outbox: NoticeOutbox): void {
    told.delete(outbox);
}

/**
 * Says that some files of the repo could not be read. The log gets the path and the reason of
 * each one, which is what someone looking into it needs; the window gets a code with the count
 * and the names the files carry, which is what the person needs, and never a path or an id. When
 * none of them carries a name the code says so (`files-unreadable-unnamed`) and lists nothing.
 *
 * The lateral reloads the collection often, so a file already told is not told again: only a file
 * not told yet raises a notice, and that notice counts every file told so far, under one key
 * per origin so the window folds it into a single toast.
 */
export function reportUnreadable(
    outbox: NoticeOutbox,
    logger: Logger,
    warnings: readonly LoadWarning[],
): void {
    const key = `files-unreadable:${activeOrigin()?.id ?? ''}`;
    const known = knownOf(outbox, key);
    const fresh = warnings.filter((warning) => !known.has(warning.path));

    for (const warning of fresh) {
        logger.log('warn', `${warning.path} could not be read: ${warning.message}`);
        known.set(warning.path, warning.name ?? '');
    }

    if (fresh.length > 0) {
        const names = shown(known);
        const code = names.length > 0 ? 'files-unreadable' : 'files-unreadable-unnamed';

        outbox.raise(code, 'warning', { count: known.size, names }, key);
    }
}
