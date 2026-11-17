/**
 * `test(name, body)`: a case with a name. The case counts from the moment it is declared, as one
 * that did not finish, and takes its result when its body ends: a throw, or a promise that is
 * rejected, is a case that failed and never stops the ones after it. `CASES` lets the end of the
 * run wait for the cases that were not awaited. Needs `I`, `OUT` and `show`.
 */
export const TEST_GUEST = String.raw`
const CASES = { open: 0, waiting: null };

function caseEnded(record, passed, thrown) {
    record.passed = passed;

    if (passed) {
        delete record.message;
    } else {
        record.message = show(thrown);
    }

    CASES.open -= 1;

    if (CASES.open === 0 && CASES.waiting !== null) {
        CASES.waiting();
    }
}

function casesDone() {
    return new I.Promise((resolve) => {
        if (CASES.open === 0) {
            resolve();
        } else {
            CASES.waiting = resolve;
        }
    });
}

function test(name, body) {
    const record = { name: show(name), passed: false, message: 'The case did not finish' };

    I.push(OUT.tests, record);
    CASES.open += 1;

    try {
        return I.then(
            I.resolve(body()),
            () => caseEnded(record, true),
            (thrown) => caseEnded(record, false, thrown),
        );
    } catch (thrown) {
        caseEnded(record, false, thrown);

        return I.resolve();
    }
}
`;
