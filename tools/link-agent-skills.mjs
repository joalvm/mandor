import { existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Skills live in `skills/`, which is the only tracked copy. The agent runners
 * read them from `.claude/skills` and `.agents/skills`, both gitignored, so
 * each one is a link to that single directory instead of a copy. Copies drift:
 * the previous repo kept two of them in sync by hand and they diverged.
 *
 * The link type is `junction` because Windows creates those without elevation.
 * Node ignores the type on POSIX and makes a plain directory symlink.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'skills');
const targets = [join(root, '.claude', 'skills'), join(root, '.agents', 'skills')];

if (!existsSync(source)) {
    console.error(`skills/ not found at ${source}`);
    process.exit(1);
}

for (const target of targets) {
    link(target);
}

/** Points `target` at `skills/`, replacing whatever stale link was there. */
function link(target) {
    mkdirSync(dirname(target), { recursive: true });

    if (isCurrentLink(target)) {
        console.log(`ok    ${relative(root, target)}`);

        return;
    }

    if (existsSync(target) || isLink(target)) {
        rmSync(target, { recursive: true, force: true });
    }

    symlinkSync(source, target, 'junction');

    console.log(`link  ${relative(root, target)} -> skills/`);
}

/** Whether the path is already a link and already resolves to `skills/`. */
function isCurrentLink(target) {
    if (!isLink(target)) {
        return false;
    }

    return resolve(readlinkSync(target)) === source;
}

function isLink(target) {
    try {
        return lstatSync(target).isSymbolicLink();
    } catch {
        return false;
    }
}
