/** A page of the site opens with a comment that holds its fields, one `key: value` per line. */
const FRONT = /^<!--\r?\n(?<fields>[\s\S]*?)\r?\n-->\r?\n?/u;

/** A gap of a template: `{{name}}` or `{{group.name}}`. */
const GAP = /\{\{\s*(?<path>[a-z][\w.-]*)\s*\}\}/giu;

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text as HTML shows it, whatever characters it holds. */
export function escapeHtml(text) {
    return String(text).replace(/[&<>"']/gu, (character) => ENTITIES[character]);
}

/**
 * The fields of a page and its body. A page with no fields is refused: every page has a title
 * and a description, which the head of the layout needs.
 */
export function parsePage(source, name = 'page') {
    const match = FRONT.exec(source);

    if (match === null) {
        throw new Error(`${name} opens with no <!-- fields --> comment.`);
    }

    const fields = Object.fromEntries(
        match.groups.fields
            .split(/\r?\n/u)
            .filter((line) => line.trim() !== '')
            .map((line) => {
                const colon = line.indexOf(':');

                return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
            }),
    );

    return { fields, body: source.slice(match[0].length) };
}

function valueAt(values, path) {
    return path
        .split('.')
        .reduce(
            (found, key) =>
                found !== null && Object.hasOwn(Object(found), key) ? found[key] : null,
            values,
        );
}

/**
 * The template with each gap filled with its value, as it is: the values are already HTML. A gap
 * with no value, or one whose value is no text, stops the build, so a typo never reaches the site.
 */
export function fill(template, values, name = 'template') {
    return template.replace(GAP, (gap, path) => {
        const value = valueAt(values, path);

        if (typeof value !== 'string') {
            throw new Error(`${name} has a gap with no text: ${gap}.`);
        }

        return value;
    });
}

/** Every text of a tree of words, escaped for HTML, keeping the shape of the tree. */
export function escapeWords(words) {
    return Object.fromEntries(
        Object.entries(words).map(([key, value]) => [
            key,
            typeof value === 'string' ? escapeHtml(value) : escapeWords(value),
        ]),
    );
}
