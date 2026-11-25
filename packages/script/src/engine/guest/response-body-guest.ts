/**
 * The words of `mandor.response.to` that read the body: as text, as a pattern and as JSON, with a
 * path into it. Needs `I`, `typeOf`, `deepEqual`, `repr` and the `claim` of
 * `RESPONSE_ASSERTION_GUEST`.
 */
export const RESPONSE_BODY_GUEST = String.raw`
function bodyOf(response) {
    const text = response.text();

    return text === undefined ? '' : text;
}

function parsedBodyOf(response) {
    try {
        return { valid: true, value: I.parse(bodyOf(response)) };
    } catch (error) {
        return { valid: false, error };
    }
}

function claimContent(response, negated) {
    claim(bodyOf(response).length > 0, negated, {
        is: 'expected response to have content in body',
        not: 'expected response to not have content in body',
    });
}

function claimJson(response, negated) {
    const parsed = parsedBodyOf(response);

    claim(parsed.valid, negated, {
        is: 'expected response body to be a valid json but got error ' + I.toText(parsed.error),
        not: 'expected response body not to be a valid json',
    });

    return parsed.value;
}

function bodyMatches(response, negated, pattern) {
    const text = bodyOf(response);

    claim(I.exec(pattern, text) !== null, negated, {
        is: 'expected response body text to match ' + repr(pattern) + ' but got ' + repr(text),
        not: 'expected response body text to not match ' + repr(pattern),
    });
}

function bodyEqualsJson(response, negated, expected) {
    const json = claimJson(response, false);

    claim(deepEqual(json, expected, []), negated, {
        is: 'expected response body json to equal ' + repr(expected) + ' but got ' + repr(json),
        not: 'expected response body json to not equal ' + repr(expected),
    });
}

function bodyEqualsText(response, negated, expected) {
    const text = bodyOf(response);

    claim(text === expected, negated, {
        is: 'expected response body to equal ' + repr(expected) + ' but got ' + repr(text),
        not: 'expected response body to not equal ' + repr(expected),
    });
}

// What body(expected) compares, by the type of what it expects; any other, the text.
const BODY_CHECKS = { regexp: bodyMatches, object: bodyEqualsJson, array: bodyEqualsJson };

function claimBody(response, negated, args) {
    if (args.length === 0) {
        claimContent(response, negated);

        return;
    }

    const check = BODY_CHECKS[typeOf(args[0])];

    (check === undefined ? bodyEqualsText : check)(response, negated, args[0]);
}

// The steps of a path into JSON: 'items[0].id' is items, 0, id.
function stepsOf(path) {
    const steps = [];
    const pattern = /[^.[\]]+/g;
    let found = I.exec(pattern, path);

    while (found !== null) {
        I.push(steps, found[0]);
        found = I.exec(pattern, path);
    }

    return steps;
}

function walk(json, path) {
    const steps = stepsOf(path);
    let at = json;

    for (let index = 0; index < steps.length; index += 1) {
        if (at === null || typeof at !== 'object' || !I.hasOwn(at, steps[index])) {
            return { found: false };
        }

        at = at[steps[index]];
    }

    return { found: true, value: at };
}

function claimJsonAt(json, negated, args) {
    const path = I.toText(args[0]);
    const at = walk(json, path);

    if (args.length < 2) {
        claim(at.found, negated, {
            is: 'expected ' + repr(json) + ' in response to contain property ' + repr(path),
            not: 'expected ' + repr(json) + ' in response to not contain property ' + repr(path),
        });

        return;
    }

    claim(at.found && deepEqual(at.value, args[1], []), negated, {
        is: 'expected response body json at ' + repr(path) + ' to contain ' + repr(args[1]) + ' but got ' + repr(at.value),
        not: 'expected response body json at ' + repr(path) + ' to not contain ' + repr(args[1]),
    });
}

function claimJsonBody(response, negated, args) {
    if (args.length === 0) {
        claimJson(response, negated);

        return;
    }

    if (typeof args[0] !== 'string') {
        bodyEqualsJson(response, negated, args[0]);

        return;
    }

    claimJsonAt(claimJson(response, false), negated, args);
}
`;
