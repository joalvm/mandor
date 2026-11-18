import { API_BY_EVENT, type ScriptApiObject } from '../api/script-api.js';
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
import { RESPONSE_GUEST } from './guest/response-guest.js';
import { SEND_GUEST } from './guest/send-guest.js';
import { SOCKET_GUEST } from './guest/socket-guest.js';
import { TEST_GUEST } from './guest/test-guest.js';
import { VARS_GUEST } from './guest/vars-guest.js';
import { HOST_SEND } from './send-bridge.js';
import { PENDING_MESSAGE } from './session.js';

/** The name of the one global the guest keeps for the host: it cannot be replaced or deleted. */
export const RESCUE = 'mandorRescue';

/** The line of the source where the script starts. */
export const SCRIPT_FIRST_LINE = 3;

// What each name of the API is in the guest. The script gets them as the parameters of its function.
const GUEST_NAME: Record<ScriptApiObject, string> = {
    console: 'consoleApi',
    atob: 'atob',
    btoa: 'btoa',
    URLSearchParams: 'URLSearchParams',
    vars: 'varsApi',
    test: 'test',
    expect: 'expect',
    request: 'requestApi',
    response: 'responseApi',
    message: 'messageApi',
    socket: 'socketApi',
    sendRequest: 'sendRequest',
};

function guestOf(input: ScriptRunInput): string {
    const { objects, requestWrites } = API_BY_EVENT[input.event];

    return [
        INTRINSICS_GUEST,
        `const SNAPSHOT = I.parse(${JSON.stringify(JSON.stringify(input.snapshot))});`,
        `const LINE_UNITS = ${String(SCRIPT_LIMITS.lineBytes)};`,
        `const CUT_MARK = ${JSON.stringify(CUT_MARK)};`,
        `const SOCKET_SENDS = ${String(SCRIPT_LIMITS.socketSendsPerRun)};`,
        `const WRITES = ${JSON.stringify(requestWrites)};`,
        `const RESCUE = ${JSON.stringify(RESCUE)};`,
        `const SEND_NAME = ${JSON.stringify(HOST_SEND)};`,
        `const PENDING_MESSAGE = ${JSON.stringify(PENDING_MESSAGE)};`,
        'const OUT = { effects: [], logs: [], tests: [] };',
        CONSOLE_GUEST,
        LISTS_GUEST,
        EFFECTS_GUEST,
        VARS_GUEST,
        ENCODING_GUEST,
        LINES_GUEST,
        REQUEST_GUEST,
        RESPONSE_GUEST,
        SEND_GUEST,
        SOCKET_GUEST,
        TEST_GUEST,
        DEEP_EQUAL_GUEST,
        EXPECT_GUEST,
        `const ARGS = [${objects.map((name) => GUEST_NAME[name]).join(', ')}];`,
        FRAME_GUEST,
    ].join('\n');
}

/**
 * The source the engine runs. The script goes first, as the body of an async function whose
 * parameters are the objects its event shows, and the guest after it as the argument: the guest is
 * built before the function runs, and nothing of it is in the scope of the script.
 */
export function scriptSourceOf(input: ScriptRunInput): string {
    const params = API_BY_EVENT[input.event].objects.join(', ');

    return `(function (run) {\nreturn run(async function (${params}) {\n${input.source}\n});\n})((function () {\n${guestOf(input)}\n})())`;
}
