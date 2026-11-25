import {
    API_BY_EVENT,
    STANDARD_NAMES,
    type MandorMember,
    type StandardName,
} from '../api/script-api.js';
import { CUT_MARK } from '../contract/clamp-text.js';
import type { ScriptRunInput } from '../contract/script-run.js';
import { SCRIPT_LIMITS } from '../limits/script-limits.js';

import { CONSOLE_GUEST } from './guest/console-guest.js';
import { DEEP_EQUAL_GUEST } from './guest/deep-equal-guest.js';
import { EFFECTS_GUEST } from './guest/effects-guest.js';
import { ENCODING_GUEST } from './guest/encoding-guest.js';
import { EXPECT_GUEST } from './guest/expect-guest.js';
import { FRAME_GUEST } from './guest/frame-guest.js';
import { INTRINSICS_GUEST } from './guest/intrinsics-guest.js';
import { LINES_GUEST } from './guest/lines-guest.js';
import { LISTS_GUEST } from './guest/lists-guest.js';
import { REQUEST_GUEST } from './guest/request-guest.js';
import { RESPONSE_ASSERTION_GUEST } from './guest/response-assertion-guest.js';
import { RESPONSE_BODY_GUEST } from './guest/response-body-guest.js';
import { RESPONSE_GUEST } from './guest/response-guest.js';
import { SEND_GUEST } from './guest/send-guest.js';
import { SOCKET_GUEST } from './guest/socket-guest.js';
import { TEST_GUEST } from './guest/test-guest.js';
import { VARIABLES_GUEST } from './guest/variables-guest.js';
import { HOST_SCHEMA } from './schema-bridge.js';
import { HOST_SEND } from './send-bridge.js';
import { PENDING_MESSAGE } from './session.js';

/** The name of the one global the guest keeps for the host: it cannot be replaced or deleted. */
export const RESCUE = 'mandorRescue';

/** The line of the source where the script starts. */
export const SCRIPT_FIRST_LINE = 4;

// What each name of JavaScript is in the guest. The script gets them as parameters of its function.
const STANDARD_GUEST: Record<StandardName, string> = {
    console: 'consoleApi',
    atob: 'atob',
    btoa: 'btoa',
    URLSearchParams: 'URLSearchParams',
};

// What each member of `mandor` is in the guest.
const MEMBER_GUEST: Record<MandorMember, string> = {
    variables: 'variablesApi',
    test: 'test',
    expect: 'expect',
    request: 'requestApi',
    response: 'responseApi',
    message: 'messageApi',
    socket: 'socketApi',
    sendRequest: 'sendRequest',
};

/** The parameters of the function of the script: the names of JavaScript, then `mandor`. */
const PARAMETERS = [...STANDARD_NAMES, 'mandor'].join(', ');

/** The guest line that builds `mandor` with what the event shows, and no other member. */
function mandorOf(members: readonly MandorMember[]): string {
    const fields = members.map((member) => `${member}: ${MEMBER_GUEST[member]}`).join(', ');

    return `const mandorApi = { ${fields} };`;
}

function guestOf(input: ScriptRunInput): string {
    const { members, requestWrites } = API_BY_EVENT[input.event];

    return [
        INTRINSICS_GUEST,
        `const SNAPSHOT = I.parse(${JSON.stringify(JSON.stringify(input.snapshot))});`,
        `const LINE_UNITS = ${String(SCRIPT_LIMITS.lineBytes)};`,
        `const CUT_MARK = ${JSON.stringify(CUT_MARK)};`,
        `const SOCKET_SENDS = ${String(SCRIPT_LIMITS.socketSendsPerRun)};`,
        `const WRITES = ${JSON.stringify(requestWrites)};`,
        `const RESCUE = ${JSON.stringify(RESCUE)};`,
        `const SEND_NAME = ${JSON.stringify(HOST_SEND)};`,
        `const SCHEMA_NAME = ${JSON.stringify(HOST_SCHEMA)};`,
        `const PENDING_MESSAGE = ${JSON.stringify(PENDING_MESSAGE)};`,
        'const OUT = { effects: [], logs: [], tests: [] };',
        CONSOLE_GUEST,
        LISTS_GUEST,
        EFFECTS_GUEST,
        VARIABLES_GUEST,
        ENCODING_GUEST,
        LINES_GUEST,
        REQUEST_GUEST,
        RESPONSE_GUEST,
        SEND_GUEST,
        SOCKET_GUEST,
        TEST_GUEST,
        DEEP_EQUAL_GUEST,
        EXPECT_GUEST,
        RESPONSE_ASSERTION_GUEST,
        RESPONSE_BODY_GUEST,
        mandorOf(members),
        `const ARGS = [${STANDARD_NAMES.map((name) => STANDARD_GUEST[name]).join(', ')}, mandorApi];`,
        FRAME_GUEST,
    ].join('\n');
}

/**
 * The source the engine runs. The script goes first, in a block of its own inside an async
 * function whose parameters are the names of JavaScript and `mandor`, and the guest after it as
 * the argument: the guest is built before the function runs, and nothing of it is in the scope of
 * the script. The block lets the script declare any name, `mandor` too: it shadows.
 */
export function scriptSourceOf(input: ScriptRunInput): string {
    return `(function (run) {\nreturn run(async function (${PARAMETERS}) {\n{\n${input.source}\n}\n});\n})((function () {\n${guestOf(input)}\n})())`;
}
