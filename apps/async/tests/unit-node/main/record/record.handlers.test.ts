import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createActivityRecorder } from '../../../../src/main/record/activity-recorder.js';
import {
    registerRecordHandlers,
    type RecordHandlerDeps,
} from '../../../../src/main/record/record.handlers.js';

// The recorder opens the file it is given, so the path has to exist on every machine.
const ECHO = join(tmpdir(), 'echo.jsonl');
const OTHER = join(tmpdir(), 'other.jsonl');

type Handler = (event: unknown, raw: unknown) => Promise<unknown>;

/** What the window holds after the save dialog answered: the path main itself handed out. */
async function picked(handlers: Map<string, Handler>, path = ECHO): Promise<void> {
    await handlers.get('record:pick')?.({}, { suggestedName: path });
}

function harness(): { deps: RecordHandlerDeps; handlers: Map<string, Handler> } {
    const recorder = createActivityRecorder({ onState: vi.fn() });
    const deps: RecordHandlerDeps = {
        chooseSavePath: vi.fn((suggestedName: string) => Promise.resolve(suggestedName)),
        recorder,
        reveal: vi.fn(),
    };
    const handlers = new Map<string, Handler>();
    const ipc = {
        handle: (channel: string, listener: Handler) => {
            handlers.set(channel, listener);
        },
        removeHandler: () => undefined,
    };

    registerRecordHandlers(ipc, deps);

    return { deps, handlers };
}

describe('the channels of the recording', () => {
    it('answers the pick with the path the dialog produced', async () => {
        const { deps, handlers } = harness();

        const answer = await handlers.get('record:pick')?.({}, { suggestedName: ECHO });

        expect(answer).toEqual({ ok: true, value: { path: ECHO } });
        expect(deps.chooseSavePath).toHaveBeenCalledWith(ECHO);
    });

    it('starts with the path the user picked and refuses a second file for one connection', async () => {
        const { handlers } = harness();
        const start = handlers.get('record:start') ?? (() => Promise.resolve(undefined));

        await picked(handlers);
        await picked(handlers, OTHER);
        await start({}, { connectionId: 'echo', path: ECHO });

        const again = await start({}, { connectionId: 'echo', path: OTHER });

        expect(again).toMatchObject({ ok: false, error: { code: 'record-active' } });
    });

    it('tells a file the system would not open apart from a recording already running', async () => {
        const { handlers } = harness();
        const unreachable = join(tmpdir(), 'mandor-no-such-folder', 'echo.jsonl');

        await picked(handlers, unreachable);

        const answer = await handlers.get('record:start')?.(
            {},
            { connectionId: 'echo', path: unreachable },
        );

        expect(answer).toMatchObject({ ok: false, error: { code: 'fs-write' } });
    });

    it('refuses to start without a path the user chose', async () => {
        const { handlers } = harness();

        const answer = await handlers.get('record:start')?.({}, { connectionId: 'echo' });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    /** The window names the path, but only main's own dialog can have produced it. */
    it('refuses to start on a path the save dialog never gave', async () => {
        const { handlers } = harness();

        await picked(handlers);

        const answer = await handlers.get('record:start')?.(
            {},
            { connectionId: 'echo', path: OTHER },
        );

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('stops and answers where the file stayed, and refuses a stop without a recording', async () => {
        const { handlers } = harness();
        const start = handlers.get('record:start') ?? (() => Promise.resolve(undefined));

        await picked(handlers);
        await start({}, { connectionId: 'echo', path: ECHO });

        const stopped = await handlers.get('record:stop')?.({}, { connectionId: 'echo' });

        expect(stopped).toEqual({ ok: true, value: { entries: 0, path: ECHO } });

        const again = await handlers.get('record:stop')?.({}, { connectionId: 'echo' });

        expect(again).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('answers whether the connection is being written', async () => {
        const { handlers } = harness();
        const start = handlers.get('record:start') ?? (() => Promise.resolve(undefined));

        await picked(handlers);
        await start({}, { connectionId: 'echo', path: ECHO });

        const answer = await handlers.get('record:status')?.({}, { connectionId: 'echo' });

        expect(answer).toEqual({ ok: true, value: { active: true, entries: 0 } });
    });

    it('hands the path to the port that shows it where it lives', async () => {
        const { deps, handlers } = harness();

        await picked(handlers);
        await handlers.get('record:reveal')?.({}, { path: ECHO });

        expect(deps.reveal).toHaveBeenCalledWith(ECHO);
    });

    it('refuses to show a path the save dialog never gave', async () => {
        const { deps, handlers } = harness();

        const answer = await handlers.get('record:reveal')?.({}, { path: ECHO });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(deps.reveal).not.toHaveBeenCalled();
    });
});
