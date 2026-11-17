/**
 * `vars` of the script. It reads the variables of the snapshot and writes none: `set` leaves an
 * effect for main to judge, and shows the value to the reads that follow. A secret is in the
 * snapshot as a name alone, so there is no value here to give. Needs `I`, `SNAPSHOT`, `OUT` and
 * `show`.
 */
export const VARS_GUEST = String.raw`
const known = I.create(null);
const written = I.create(null);
const warned = I.create(null);

for (let index = 0; index < SNAPSHOT.variables.length; index += 1) {
    known[SNAPSHOT.variables[index].name] = SNAPSHOT.variables[index];
}

function keep(name) {
    const found = known[name];

    if (found !== undefined && found.withheld === true && warned[name] === undefined) {
        warned[name] = true;
        noticeLine('secret-unreadable', { name });
    }

    return found;
}

function valueOfName(name) {
    const found = keep(name);

    return found === undefined || found.withheld === true ? undefined : found.value;
}

function setVar(name, value) {
    const key = I.toText(name);
    const text = show(value);
    const effect = written[key];

    known[key] = { name: key, value: text };

    if (effect === undefined) {
        written[key] = { kind: 'var', name: key, value: text };
        I.push(OUT.effects, written[key]);
    } else {
        effect.value = text;
    }
}

function placeholderText(raw) {
    if (I.slice(raw, 0, 1) === '\\') {
        return I.slice(raw, 1);
    }

    const found = known[I.slice(raw, 2, -2)];

    return found === undefined || found.withheld === true ? raw : found.value;
}

function replaceIn(text) {
    const source = I.toText(text);
    const placeholder = /\\?\{\{[^\s{}]+\}\}/g;
    let out = '';
    let cursor = 0;

    for (let match = I.exec(placeholder, source); match !== null; match = I.exec(placeholder, source)) {
        out += I.slice(source, cursor, match.index) + placeholderText(match[0]);
        cursor = match.index + match[0].length;
    }

    return out + I.slice(source, cursor);
}

const varsApi = {
    get(name) { return valueOfName(I.toText(name)); },
    set(name, value) { setVar(name, value); },
    has(name) { return known[I.toText(name)] !== undefined; },
    replaceIn(text) { return replaceIn(text); },
};
`;
