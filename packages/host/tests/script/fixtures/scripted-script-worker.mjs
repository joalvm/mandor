// A worker of scripts that behaves as its input says, so each way a real worker can go wrong
// (hang, lie, die, burst its heap) happens in a real thread. It never loads the engine.
import { parentPort, threadId } from 'node:worker_threads';

const MULTIBYTE_CHARS = Math.ceil((1024 * 1024) / 3) + 1;

function done(runId, extra) {
    parentPort.postMessage({ kind: 'done', runId, ...extra });
}

function failed(runId, extra) {
    parentPort.postMessage({ kind: 'failed', runId, ...extra });
}

// In pieces well under the ceiling, as a script that swells does: one array larger than the whole
// heap is an allocation V8 cannot meet, and on Windows it ends the process instead of the worker.
function burstHeap() {
    const keep = [];

    for (;;) {
        keep.push(new Array(1_000_000).fill(keep.length));
    }
}

const BEHAVIORS = {
    ok: (runId) => done(runId, { output: 'ok' }),
    env: (runId) => done(runId, { output: String(Object.keys(process.env).length) }),
    thread: (runId) => done(runId, { output: String(threadId) }),
    multibyte: (runId) => done(runId, { output: '€'.repeat(MULTIBYTE_CHARS) }),
    'huge-error': (runId) =>
        failed(runId, { error: { message: '€'.repeat(MULTIBYTE_CHARS), errorName: 'Error' } }),
    'script-error': (runId) =>
        failed(runId, { error: { message: 'boom', errorName: 'Error', line: 1 } }),
    'fault-memory': (runId) =>
        failed(runId, { error: { message: 'full', errorName: 'InternalError' }, fault: 'memory' }),
    'empty-done': (runId) => done(runId, {}),
    hang: () => {},
    'start-twice': (runId) => parentPort.postMessage({ kind: 'started', runId }),
    'send-and-run': (runId) =>
        parentPort.postMessage({ kind: 'send', runId, sendId: 's1', payload: '{"to":"x"}' }),
    'send-wait': (runId) => {
        parentPort.postMessage({ kind: 'send', runId, sendId: 's1', payload: '{"to":"x"}' });
        parentPort.postMessage({ kind: 'waiting', runId });
    },
    'send-many': (runId) => {
        expected = 12;

        for (let index = 1; index <= 12; index += 1) {
            parentPort.postMessage({ kind: 'send', runId, sendId: `s${index}`, payload: '{}' });
        }

        parentPort.postMessage({ kind: 'waiting', runId });
    },
    'send-two': (runId) => {
        expected = 2;
        parentPort.postMessage({ kind: 'send', runId, sendId: 's1', payload: 'one' });
        parentPort.postMessage({ kind: 'send', runId, sendId: 's2', payload: 'two' });
        parentPort.postMessage({ kind: 'waiting', runId });
        parentPort.postMessage({ kind: 'waiting', runId });
    },
    'send-twice': (runId) => {
        parentPort.postMessage({ kind: 'send', runId, sendId: 's1', payload: '{}' });
        parentPort.postMessage({ kind: 'send', runId, sendId: 's1', payload: '{}' });
    },
    'waiting-alone': (runId) => parentPort.postMessage({ kind: 'waiting', runId }),
    'double-done': (runId) => {
        done(runId, { output: 'first' });
        done(runId, { output: 'second' });
    },
    'foreign-run': () => done('some-other-run', { output: 'ok' }),
    garbage: () => parentPort.postMessage('garbage'),
    'worker-asks-run': (runId) => parentPort.postMessage({ kind: 'run', runId, input: 'x' }),
    die: () => process.exit(3),
    heap: burstHeap,
};

let expected = 1;
const received = [];

parentPort.on('message', (message) => {
    if (message.kind === 'sent') {
        received.push(message.reply);

        if (received.length >= expected) {
            done(message.runId, { output: `got:${received.join(',')}` });
        }

        return;
    }

    const behavior = behaviorOf(message.input);

    // `mute` never begins the script; `slow-start` begins it once its start is long over.
    if (behavior === 'mute') {
        return;
    }

    if (behavior === 'slow-start') {
        // timing-policy: a start that takes longer than the time of the script is what is tested.
        setTimeout(() => {
            parentPort.postMessage({ kind: 'started', runId: message.runId });
            done(message.runId, { output: 'late start' });
        }, 300);

        return;
    }

    parentPort.postMessage({ kind: 'started', runId: message.runId });
    (BEHAVIORS[behavior] ?? failOnUnknown)(message.runId);
});

// The input is the name of the behavior, or the JSON text of a run that names it with `behavior`.
function behaviorOf(input) {
    try {
        return JSON.parse(input)?.behavior ?? input;
    } catch {
        return input;
    }
}

function failOnUnknown(runId) {
    failed(runId, { error: { message: 'no such behavior', errorName: 'FixtureError' } });
}
