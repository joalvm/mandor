/**
 * `mandor.response.to`: assertions about a response, worded as the chai of Postman words them, so
 * a test brought from there reads and fails the same. The chain words say nothing; `not` flips
 * what comes after; a flag asserts when it is read, a verb when it is called. A word that fails
 * throws an `AssertionError` with the message Postman gives. Needs `I`, `repr`, the `CHAIN` and
 * the `assertion` of `EXPECT_GUEST`, and the words of the body, `RESPONSE_BODY_GUEST`.
 */
export const RESPONSE_ASSERTION_GUEST = String.raw`
// The reason phrase of each standard status, as the status line of HTTP/1.1 says it.
const REASONS = {
    100: 'Continue', 101: 'Switching Protocols', 200: 'OK', 201: 'Created', 202: 'Accepted',
    203: 'Non-Authoritative Information', 204: 'No Content', 205: 'Reset Content',
    206: 'Partial Content', 300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Found',
    303: 'See Other', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
    400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable', 408: 'Request Timeout',
    409: 'Conflict', 410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed',
    413: 'Payload Too Large', 414: 'URI Too Long', 415: 'Unsupported Media Type',
    422: 'Unprocessable Entity', 425: 'Too Early', 428: 'Precondition Required',
    429: 'Too Many Requests', 431: 'Request Header Fields Too Large', 500: 'Internal Server Error',
    501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
};

// The flags that name the first digit of the status.
const STATUS_CLASSES = { info: 1, success: 2, redirection: 3, clientError: 4, serverError: 5 };

// The flags that name one status.
const STATUS_NAMES = {
    ok: 200, accepted: 202, withoutContent: 204, badRequest: 400, unauthorized: 401,
    unauthorised: 401, forbidden: 403, notFound: 404, notAcceptable: 406, rateLimited: 429,
};

function claim(holds, negated, said) {
    if (holds === negated) {
        const error = new I.Error(negated ? said.not : said.is);

        error.name = 'AssertionError';
        throw error;
    }
}

function claimCode(response, negated, code) {
    const actual = response.status;

    claim(actual === code, negated, {
        is: 'expected response to have status code ' + repr(code) + ' but got ' + repr(actual),
        not: 'expected response to not have status code ' + repr(actual),
    });
}

function claimClass(response, negated, digit) {
    const actual = response.status;

    claim((actual - (actual % 100)) / 100 === digit, negated, {
        is: 'expected response code to be ' + digit + 'XX but found ' + repr(actual),
        not: 'expected response code to not be ' + digit + 'XX',
    });
}

function claimError(response, negated) {
    const actual = response.status;

    claim(actual >= 400 && actual < 600, negated, {
        is: 'expected response code to be 4XX or 5XX but found ' + repr(actual),
        not: 'expected response code to not be 4XX or 5XX',
    });
}

function claimReason(response, negated, reason) {
    const standard = REASONS[response.status];
    const actual = standard === undefined ? '' : standard;

    claim(actual === reason, negated, {
        is: 'expected response to have status reason ' + repr(reason) + ' but got ' + repr(actual),
        not: 'expected response to not have status reason ' + repr(actual),
    });
}

function claimStatus(response, negated, args) {
    if (typeof args[0] === 'string') {
        claimReason(response, negated, args[0]);

        return;
    }

    claimCode(response, negated, args[0]);
}

function claimHeader(response, negated, args) {
    const key = I.toText(args[0]);
    const has = response.headers.has(key);

    if (args.length < 2 || (!has && !negated)) {
        claim(has, negated, {
            is: "expected response to have header with key '" + key + "'",
            not: "expected response to not have header with key '" + key + "'",
        });

        return;
    }

    const actual = response.headers.get(key);

    claim(has && actual === args[1], negated, {
        is: "expected '" + key + "' response header to be " + repr(args[1]) + ' but got ' + repr(actual),
        not: "expected '" + key + "' response header to not be " + repr(args[1]),
    });
}

// responseTime and responseSize: read, the assertion goes on about the number, as in chai-postman
// (responseTime.below(500)); called, they assert the number is that one.
function numberWord(actual, negated, said) {
    const call = (...args) => {
        claim(typeof actual === 'number' && (args.length === 0 || actual === args[0]), negated, said(args));

        return call;
    };

    return assertion(actual, negated, call);
}

function timeWord(response, negated) {
    const actual = response.time;

    return numberWord(actual, negated, () => ({
        is: 'expected response to have a valid response time but got ' + repr(actual),
        not: 'expected response to not have a valid response time but got ' + repr(actual),
    }));
}

function sizeWord(size, negated) {
    const actual = size();

    return numberWord(actual, negated, (args) => ({
        is: args.length === 0
            ? 'expected response to have a valid response size but got ' + repr(actual)
            : 'expected response size to equal ' + repr(args[0]) + ' but got ' + repr(actual),
        not: args.length === 0
            ? 'expected response to not have a valid response size but got ' + repr(actual)
            : 'expected response size to not equal ' + repr(args[0]),
    }));
}

// Each verb, by the name a script calls it with.
const RESPONSE_VERBS = {
    status: claimStatus,
    statusCode: (response, negated, args) => claimCode(response, negated, +args[0]),
    statusCodeClass: (response, negated, args) => claimClass(response, negated, +args[0]),
    statusReason: (response, negated, args) => claimReason(response, negated, I.toText(args[0])),
    header: claimHeader,
    body: claimBody,
    jsonBody: claimJsonBody,
    jsonSchema: claimSchema,
};

// Each flag that is not a status: what it asserts when it is read.
const RESPONSE_FLAGS = { error: claimError, json: claimJson, withBody: claimContent };

function defineFlag(self, name, check) {
    I.define(self, name, { get: () => { check(); return self; } });
}

function defineStatusFlags(self, response, negated) {
    const classes = I.keys(STATUS_CLASSES);
    const names = I.keys(STATUS_NAMES);

    for (let index = 0; index < classes.length; index += 1) {
        const digit = STATUS_CLASSES[classes[index]];

        defineFlag(self, classes[index], () => claimClass(response, negated, digit));
    }

    for (let index = 0; index < names.length; index += 1) {
        const code = STATUS_NAMES[names[index]];

        defineFlag(self, names[index], () => claimCode(response, negated, code));
    }
}

function responseAssertion(response, negated, size) {
    const self = {};
    const same = { get: () => self };
    const flags = I.keys(RESPONSE_FLAGS);
    const verbs = I.keys(RESPONSE_VERBS);

    I.define(self, 'not', { get: () => responseAssertion(response, !negated, size) });
    I.define(self, 'responseTime', { get: () => timeWord(response, negated) });
    I.define(self, 'responseSize', { get: () => sizeWord(size, negated) });

    for (let index = 0; index < CHAIN.length; index += 1) {
        I.define(self, CHAIN[index], same);
    }

    defineStatusFlags(self, response, negated);

    for (let index = 0; index < flags.length; index += 1) {
        const check = RESPONSE_FLAGS[flags[index]];

        defineFlag(self, flags[index], () => check(response, negated));
    }

    for (let index = 0; index < verbs.length; index += 1) {
        const verb = RESPONSE_VERBS[verbs[index]];

        const call = (...args) => { verb(response, negated, args); return self; };

        I.define(self, verbs[index], { value: call });
    }

    return self;
}
`;
