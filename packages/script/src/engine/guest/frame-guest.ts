import { UNREADABLE } from '../parse-thrown.js';

// Reads a thrown value as one JSON text of its name, message and stack, with the `toText` and
// `encode` it is given: whoever builds it hands over the ones it kept before any script ran, so a
// script that replaces `String` or `JSON.stringify` cannot change what this reports. A value whose
// fields cannot be read is the error that could not be read.
const DESCRIBE_WITH = String.raw`(toText, encode) => (thrown) => {
    try {
        const box = thrown !== null && (typeof thrown === 'object' || typeof thrown === 'function');
        const name = box && typeof thrown.name === 'string' ? thrown.name : 'Error';
        const message = box && typeof thrown.message === 'string' ? thrown.message : toText(thrown);
        const stack = box && typeof thrown.stack === 'string' ? thrown.stack : '';

        return encode({ name, message, stack });
    } catch {
        return encode({ name: ${JSON.stringify(UNREADABLE.errorName)}, message: ${JSON.stringify(UNREADABLE.message)}, stack: '' });
    }
}`;

/**
 * The describe the host keeps for a run: built in the context before the script, with the
 * `String` and `JSON.stringify` it has then. It returns one JSON text.
 */
export const DESCRIBE_THROWN = `(${DESCRIBE_WITH})(String, JSON.stringify)`;

/**
 * The guest that ends the run: it reads a thrown value with the intrinsics it kept, and builds the
 * one JSON text the host reads. `run` is what the frame calls with the script. Needs `I`, `OUT`,
 * `ARGS`, `RESCUE`, `PENDING_MESSAGE` and `casesDone`.
 */
export const FRAME_GUEST = `const describe = (${DESCRIBE_WITH})(I.toText, I.stringify);
function finish(failed, thrown) {
    const result = { effects: OUT.effects, logs: OUT.logs, tests: OUT.tests };

    if (failed) {
        result.error = describe(thrown);
    }

    return I.stringify(result);
}

let ended = null;

// The run is over for the host when the script is, and every case it declared has ended too. When
// nothing can move and a case still waits, the host asks for this: the output as it stands, with
// that case marked as not finished, and the error of the script if the script itself is stuck.
function stuck() {
    return ended === null
        ? finish(true, { name: 'ScriptPending', message: PENDING_MESSAGE, stack: '' })
        : finish(ended.failed, ended.thrown);
}

I.define(globalThis, RESCUE, { value: stuck });

return function run(user) {
    return new I.Promise((resolve) => {
        const end = (failed, thrown) => {
            ended = { failed, thrown };
            I.then(casesDone(), () => resolve(finish(failed, thrown)));
        };

        I.then(user(...ARGS), () => end(false), (thrown) => end(true, thrown));
    });
};
`;
