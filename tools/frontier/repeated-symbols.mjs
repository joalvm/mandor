/**
 * The frontier, read the other way round: a name that two modules export from their own tree is
 * a hint that what they both do never went up, or went up twice. A module is a package or a
 * feature of an app; the rest of an app's tree is one more module, named after the app.
 *
 * A hint and not a rule. Two windows can name two different things alike, and turning this
 * into an error would be answered by inventing an ugly name to quiet it.
 */

/** What a module offers to the rest of the tree, declared or handed on by a barrel. */
const DECLARED = /export (?:async )?(?:function|const|let|class|type|interface) (\w+)/g;
const HANDED_ON = /export (?:type )?\{([^}]*)\}/g;

/** @param {string} text */
function exportedNames(text) {
    const declared = [...text.matchAll(DECLARED)].map(([, name]) => name);
    const handedOn = [...text.matchAll(HANDED_ON)].flatMap(([, list]) =>
        list
            .split(',')
            .map((entry) =>
                entry
                    .trim()
                    .replace(/^type /, '')
                    .split(' as ')
                    .pop(),
            )
            .filter((name) => /^\w+$/.test(name ?? '')),
    );

    return [...declared, ...handedOn];
}

/** The module a source file belongs to, or nothing when it is not source. */
function moduleOf(path) {
    const pkg = /^packages\/([^/]+)\/src\//.exec(path)?.[1];

    if (pkg !== undefined) {
        return pkg;
    }

    const feature = /^apps\/([^/]+)\/src\/renderer\/features\/([^/]+)\//.exec(path);

    if (feature !== null) {
        return `${feature[1]}/${feature[2]}`;
    }

    return /^apps\/([^/]+)\/src\//.exec(path)?.[1];
}

/** @param {readonly {path: string, text: string}[]} files */
function namesByModule(files) {
    /** @type {Map<string, Set<string>>} */
    const modules = new Map();

    for (const file of files) {
        const module = moduleOf(file.path);

        if (module === undefined) {
            continue;
        }

        const named = modules.get(module) ?? new Set();

        for (const name of exportedNames(file.text)) {
            named.add(name);
        }

        modules.set(module, named);
    }

    return modules;
}

/**
 * The names more than one module exports, each with the modules that do.
 *
 * @param {readonly {path: string, text: string}[]} files
 */
export function repeatedNames(files) {
    const modules = [...namesByModule(files)].sort(([one], [other]) => one.localeCompare(other));
    /** @type {Map<string, string[]>} */
    const seen = new Map();

    for (const [module, names] of modules) {
        for (const name of names) {
            seen.set(name, [...(seen.get(name) ?? []), module]);
        }
    }

    return [...seen]
        .filter(([, named]) => named.length > 1)
        .map(([name, named]) => ({ name, modules: named }))
        .sort((one, other) => one.name.localeCompare(other.name));
}

/** @param {readonly {name: string, modules: readonly string[]}[]} repeated */
export function repeatedNotice(repeated) {
    if (repeated.length === 0) {
        return null;
    }

    const lines = repeated.map((entry) => `  - ${entry.name} (${entry.modules.join(', ')})`);

    return [
        'frontier: more than one module exports these names from its own tree.',
        'If two of them mean the same thing, it belongs in one place.',
        ...lines,
    ].join('\n');
}
