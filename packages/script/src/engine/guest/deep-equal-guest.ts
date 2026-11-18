/**
 * The comparison of `eql`, apart from the verbs. `NaN` is equal to `NaN` and `-0` is apart from
 * `0`. Objects, arrays, dates, patterns and boxed primitives are compared by content (the own
 * enumerable keys, cycles included); a `Map`, a `Set`, an error or a function is equal only to
 * itself. Needs `I` and `listHas`.
 */
export const DEEP_EQUAL_GUEST = String.raw`
function sameValue(a, b) {
    return a === b ? a !== 0 || 1 / a === 1 / b : a !== a && b !== b;
}

function typeOf(value) {
    return I.toLower(I.slice(I.tag(value), 8, -1));
}

const BY_CONTENT = ['object', 'array', 'date', 'regexp', 'number', 'string', 'boolean'];
const BY_VALUE = ['date', 'number', 'string', 'boolean'];

function sameKeys(a, b, seen) {
    const keys = I.keys(a);

    if (keys.length !== I.keys(b).length || (I.isArray(a) && a.length !== b.length)) {
        return false;
    }

    for (let index = 0; index < keys.length; index += 1) {
        if (!I.hasOwn(b, keys[index]) || !deepEqual(a[keys[index]], b[keys[index]], seen)) {
            return false;
        }
    }

    return true;
}

function sameContent(a, b, seen) {
    const type = typeOf(a);

    if (listHas(BY_VALUE, type)) {
        return sameValue(a.valueOf(), b.valueOf());
    }

    if (type === 'regexp') {
        return a.source === b.source && a.flags === b.flags;
    }

    return sameKeys(a, b, seen);
}

// Whether a and b are objects of one type that is compared by its content.
function comparable(a, b) {
    const objects = typeof a === 'object' && typeof b === 'object' && a !== null && b !== null;

    return objects && typeOf(a) === typeOf(b) && listHas(BY_CONTENT, typeOf(a));
}

// Whether the pair is already being compared further up: a cycle counts as equal there.
function wasSeen(seen, a, b) {
    for (let index = 0; index < seen.length; index += 1) {
        if (seen[index][0] === a && seen[index][1] === b) {
            return true;
        }
    }

    return false;
}

function deepEqual(a, b, seen) {
    if (sameValue(a, b)) {
        return true;
    }

    if (!comparable(a, b)) {
        return false;
    }

    if (wasSeen(seen, a, b)) {
        return true;
    }

    I.push(seen, [a, b]);

    const same = sameContent(a, b, seen);

    I.pop(seen);

    return same;
}
`;
