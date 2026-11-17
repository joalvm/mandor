/**
 * Reading opening tags out of a component without a parser. A regular expression that stops at
 * the first `>` gets the wrong answer the moment a handler holds an arrow function, and handlers
 * hold arrow functions everywhere here, so the scan walks the braces instead of guessing.
 */

const OPENING = /<([a-z][a-z0-9]*)\b/g;

/** Where the opening tag that starts here ends, or -1 when the file stops before it does. */
function tagEnd(text, from) {
    let depth = 0;
    let quote = '';

    for (let index = from; index < text.length; index += 1) {
        const character = text[index];

        if (quote !== '') {
            quote = character === quote ? '' : quote;
        } else if (character === '"' || character === "'") {
            quote = character;
        } else if (character === '{') {
            depth += 1;
        } else if (character === '}') {
            depth -= 1;
        } else if (character === '>' && depth === 0) {
            return index;
        }
    }

    return -1;
}

/**
 * Every opening tag of a host element in the file, with the whole of its attributes and the
 * lines just above it — which is where a tag says out loud why it breaks a rule on purpose.
 */
export function openingTags(text) {
    const tags = [];

    for (const match of text.matchAll(OPENING)) {
        const end = tagEnd(text, match.index + match[0].length);

        if (end !== -1) {
            tags.push({
                before: text.slice(Math.max(0, match.index - 160), match.index),
                name: match[1],
                text: text.slice(match.index, end + 1),
            });
        }
    }

    return tags;
}
