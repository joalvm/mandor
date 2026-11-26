import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The files the updater reads: a channel, then the system and the architecture when not x64 on Windows. */
const FEED_FILE = /^(?:latest|beta|alpha)(?:-[a-z0-9]+)*\.yml$/u;

/** A line of an update file that names an installer, quoted or not, by its name alone. */
const NAMED = /^(?<lead>\s*(?:- )?(?:url|path): )(?<quote>['"]?)(?<name>[^'"\s]+)\k<quote>\s*$/u;

function pointLine(line, base) {
    const match = NAMED.exec(line);

    if (match === null || URL.canParse(match.groups.name)) {
        return line;
    }

    return `${match.groups.lead}${new URL(match.groups.name, base).href}`;
}

/**
 * An update file whose installers are named in full, on the release of their version. The feed
 * lives on a release of its own, and a name alone would be looked for beside the feed.
 */
export function pointAtRelease(text, base) {
    if (!base.endsWith('/')) {
        throw new Error(`"${base}" has to end in a slash: names are resolved inside it.`);
    }

    return text
        .split('\n')
        .map((line) => pointLine(line, base))
        .join('\n');
}

/** The update files among the names of a folder. */
export function feedFiles(names) {
    return names.filter((name) => FEED_FILE.test(name)).sort();
}

function main(dir, base) {
    const files = feedFiles(readdirSync(dir));

    if (files.length === 0) {
        throw new Error(`${dir} holds no update file: the build wrote no feed.`);
    }

    for (const name of files) {
        const path = join(dir, name);

        writeFileSync(path, pointAtRelease(readFileSync(path, 'utf8'), base), 'utf8');
        process.stdout.write(`${name}\n`);
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main(process.argv[2] ?? '.', process.argv[3] ?? '');
}
