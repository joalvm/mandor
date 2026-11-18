/**
 * `expect(value)`: assertions in the chai way, a subset and nothing more. The chain words say
 * nothing; `not` flips what comes after; a verb or a flag that fails throws an `AssertionError`
 * that says what was expected and what was received. Needs `I`, `show` and `DEEP_EQUAL_GUEST`.
 */
export const EXPECT_GUEST = String.raw`
function fullRepr(value) {
    if (typeof value === 'string') {
        return I.stringify(value);
    }

    if (value === 0 && 1 / value < 0) {
        return '-0';
    }

    return typeOf(value) === 'regexp' ? I.toText(value) : show(value);
}

function repr(value) {
    const text = fullRepr(value);

    return text.length > 80 ? I.slice(text, 0, 80) + '…' : text;
}

function includes(actual, args) {
    const item = args[0];

    if (typeof actual === 'string') {
        return typeof item === 'string' && I.indexOf(actual, item) >= 0;
    }

    if (I.isArray(actual)) {
        return listHas(actual, item);
    }

    return hasPairs(actual, item);
}

// Whether every own key of item is in actual with the same value; neither is an object, no.
function hasPairs(actual, item) {
    if (typeof actual !== 'object' || actual === null || typeof item !== 'object' || item === null) {
        return false;
    }

    const keys = I.keys(item);

    for (let index = 0; index < keys.length; index += 1) {
        if (!I.hasOwn(actual, keys[index]) || actual[keys[index]] !== item[keys[index]]) {
            return false;
        }
    }

    return true;
}

function matches(actual, args) {
    if (typeOf(args[0]) !== 'regexp') {
        throw new I.TypeError('match expects a regular expression');
    }

    return typeof actual === 'string' && I.exec(args[0], actual) !== null;
}

function hasProperty(actual, args) {
    if (actual === null || actual === undefined || !(args[0] in I.toObject(actual))) {
        return false;
    }

    return args.length < 2 || actual[args[0]] === args[1];
}

const exists = (actual) => actual !== null && actual !== undefined;
const isType = (actual, args) => typeOf(actual) === I.toText(args[0]);

// Each verb: how it reads in the message, and the test of the value and the arguments.
const VERBS = {
    equal: { phrase: 'equal', check: (actual, args) => actual === args[0] },
    eql: { phrase: 'deeply equal', check: (actual, args) => deepEqual(actual, args[0], []) },
    include: { phrase: 'include', check: includes },
    match: { phrase: 'match', check: matches },
    a: { phrase: 'be a', check: isType },
    an: { phrase: 'be an', check: isType },
    property: { phrase: 'have property', check: hasProperty },
    lengthOf: { phrase: 'have length of', check: (actual, args) => exists(actual) && actual.length === args[0] },
    above: { phrase: 'be above', check: (actual, args) => typeof actual === 'number' && actual > args[0] },
    below: { phrase: 'be below', check: (actual, args) => typeof actual === 'number' && actual < args[0] },
};

const FLAGS = {
    true: { phrase: 'be true', check: (actual) => actual === true },
    false: { phrase: 'be false', check: (actual) => actual === false },
    null: { phrase: 'be null', check: (actual) => actual === null },
    undefined: { phrase: 'be undefined', check: (actual) => actual === undefined },
    exist: { phrase: 'exist', check: exists },
};

const CHAIN = ['to', 'be', 'been', 'is', 'that', 'and', 'have', 'has', 'with', 'of'];

function assert(spec, actual, args, negated) {
    if (spec.check(actual, args) === negated) {
        const shown = [];

        for (let index = 0; index < args.length; index += 1) {
            I.push(shown, repr(args[index]));
        }

        const rest = spec === VERBS.property && shown.length > 1 ? ' of ' + shown[1] : '';
        const first = shown.length > 0 ? ' ' + shown[0] : '';
        const error = new I.Error(
            'expected ' + repr(actual) + (negated ? ' not' : '') + ' to ' + spec.phrase + first + rest,
        );

        error.name = 'AssertionError';
        throw error;
    }
}

function assertion(actual, negated) {
    const self = {};
    const same = { get: () => self };
    const flip = { get: () => assertion(actual, !negated) };

    I.define(self, 'not', flip);

    for (let index = 0; index < CHAIN.length; index += 1) {
        I.define(self, CHAIN[index], same);
    }

    const verbs = I.keys(VERBS);

    for (let index = 0; index < verbs.length; index += 1) {
        const spec = VERBS[verbs[index]];

        self[verbs[index]] = (...args) => { assert(spec, actual, args, negated); return self; };
    }

    const flags = I.keys(FLAGS);

    for (let index = 0; index < flags.length; index += 1) {
        const spec = FLAGS[flags[index]];

        I.define(self, flags[index], { get: () => { assert(spec, actual, [], negated); return self; } });
    }

    return self;
}

function expect(actual) {
    return assertion(actual, false);
}
`;
