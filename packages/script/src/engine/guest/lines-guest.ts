/**
 * A list of lines by name, as headers and query are: `get` gives the first, `has` asks, matching
 * names in any case when `ignoreCase`. With a `field` the list can also `set` and `delete`, each
 * one an effect of `kind` that carries the name as the list keeps it (in lowercase for headers),
 * and the reads that follow see it. A field the
 * event does not let the script write only says so (`canWrite`). Needs `I`, `show`, `putEffect`
 * and `canWrite`.
 */
export const LINES_GUEST = String.raw`
function newLines(source, options) {
    const { field, kind, ignoreCase } = options;
    let items = [];
    const key = (name) => (ignoreCase ? I.toLower(I.toText(name)) : I.toText(name));
    const find = (name) => {
        for (let index = 0; index < items.length; index += 1) {
            if (key(items[index].name) === key(name)) {
                return items[index];
            }
        }

        return undefined;
    };
    const without = (name) => {
        const kept = [];

        for (let index = 0; index < items.length; index += 1) {
            if (key(items[index].name) !== key(name)) {
                I.push(kept, items[index]);
            }
        }

        return kept;
    };

    for (let index = 0; index < source.length; index += 1) {
        I.push(items, { name: source[index].name, value: source[index].value });
    }

    const api = {
        get(name) {
            const found = find(name);

            return found === undefined ? undefined : found.value;
        },
        has(name) { return find(name) !== undefined; },
    };

    if (field !== undefined) {
        api.set = (name, value) => {
            if (canWrite(field)) {
                const text = show(value);

                items = without(name);
                I.push(items, { name: I.toText(name), value: text });
                putEffect({ kind, name: key(name), op: 'set', value: text });
            }
        };
        api.delete = (name) => {
            if (canWrite(field)) {
                items = without(name);
                putEffect({ kind, name: key(name), op: 'delete' });
            }
        };
    }

    return api;
}
`;
