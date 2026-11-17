import { describe, expect, it } from 'vitest';

import { memoryAfterGc } from './process-memory.js';

type Session = {
    detach: () => Promise<void>;
    send: (method: string) => Promise<unknown>;
};

type FakePage = {
    context: () => { newCDPSession: (page: FakePage) => Promise<Session> };
    evaluate: (script: string) => Promise<unknown>;
};

const ANSWERS: Record<string, unknown> = {
    'HeapProfiler.collectGarbage': {},
    'Memory.getDOMCounters': { documents: 2, jsEventListeners: 40, nodes: 900 },
    'Runtime.getHeapUsage': { totalSize: 0, usedSize: 12 * 1024 * 1024 },
};

function setup() {
    const calls: string[] = [];
    const session: Session = {
        detach: () => {
            calls.push('detach');

            return Promise.resolve();
        },
        send: (method) => {
            calls.push(method);

            return Promise.resolve(ANSWERS[method]);
        },
    };
    const page: FakePage = {
        context: () => ({ newCDPSession: () => Promise.resolve(session) }),
        evaluate: () => {
            calls.push('frame');

            return Promise.resolve(true);
        },
    };
    const app = {
        evaluate: () =>
            Promise.resolve({
                heapUsed: 6 * 1024 * 1024,
                metrics: [
                    { memory: { workingSetSize: 102400 }, type: 'Browser' },
                    { memory: { workingSetSize: 204800 }, type: 'Tab' },
                    { memory: { workingSetSize: 51200 }, type: 'Tab' },
                ],
            }),
    };

    return { app, calls, page };
}

describe('the memory of the app after the garbage is gone', () => {
    it('waits a frame, collects twice, and only then reads', async () => {
        const { app, calls, page } = setup();

        await memoryAfterGc(app, page);

        expect(calls).toEqual([
            'frame',
            'HeapProfiler.collectGarbage',
            'HeapProfiler.collectGarbage',
            'Runtime.getHeapUsage',
            'Memory.getDOMCounters',
            'detach',
        ]);
    });

    it('adds the processes by kind and tells the heap and the DOM in plain numbers', async () => {
        const { app, page } = setup();

        expect(await memoryAfterGc(app, page)).toEqual({
            byType: { Browser: 100, Tab: 250 },
            documents: 2,
            domNodes: 900,
            heapUsedMb: 12,
            listeners: 40,
            mainHeapUsedMb: 6,
            workingSetMb: 350,
        });
    });
});
