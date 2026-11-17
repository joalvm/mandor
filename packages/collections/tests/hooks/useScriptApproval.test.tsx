import { success, type ScriptsApproveRequest, type ScriptStatus } from '@mandor/ipc';
import { bridge, dropOriginState, settlePendingWrites } from '@mandor/shell';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScriptApproval, type ScriptPlace } from '../../src/hooks/useScriptApproval.js';

const PLACE: ScriptPlace = { workspaceId: 'events', level: 'request', event: 'onBeforeRequest' };

const KEY = 'pedidos/alta:request:onBeforeRequest';

/** Past the pause that ends the typing of a script. */
const AFTER_THE_PAUSE = 60_000;

/**
 * Main as the window meets it: a text is approved once the button says so, or once it was typed
 * over a text that was approved or empty. Nothing else approves.
 */
function fakeMain(approved = new Set<string>()) {
    const status = vi
        .spyOn(bridge.scripts, 'status')
        .mockImplementation(({ scripts }) =>
            Promise.resolve(
                success({ statuses: scripts.map(({ source }) => statusOf(approved, source)) }),
            ),
        );
    const approve = vi
        .spyOn(bridge.scripts, 'approve')
        .mockImplementation((request: ScriptsApproveRequest) => {
            const earlier = request.previousSource;
            const granted = earlier === undefined || earlier === '' || approved.has(earlier);

            if (granted) {
                approved.add(request.source);
            }

            return Promise.resolve(success({ approved: granted }));
        });

    return { approved, approve, status };
}

function statusOf(approved: Set<string>, source: string): ScriptStatus {
    return approved.has(source) ? 'approved' : 'unapproved';
}

function opened(source: string) {
    return renderHook(({ text }: { text: string }) => useScriptApproval(PLACE, KEY, text), {
        initialProps: { text: source },
    });
}

type Opened = ReturnType<typeof opened>;

/** The answers main already sent reach the window. */
async function answered(): Promise<void> {
    await act(() => vi.advanceTimersByTimeAsync(0));
}

/** A key typed: the editor says so, and the draft carries the new text back. */
async function type(view: Opened, next: string): Promise<void> {
    act(() => {
        view.result.current.typed(next);
    });
    view.rerender({ text: next });
    await answered();
}

/** A text that came from outside the editor: a reload from disk, a pull, a conversion. */
async function replaced(view: Opened, next: string): Promise<void> {
    view.rerender({ text: next });
    await answered();
}

async function pausedLong(): Promise<void> {
    await act(() => vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE));
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    dropOriginState();
    vi.useRealTimers();
});

describe('a script typed over an approved text (useScriptApproval)', () => {
    it('arrives approved at a send that leaves before the pause ends', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        await type(view, 'a();b()');
        await act(() => settlePendingWrites());

        expect(main.approve).toHaveBeenCalledWith({
            ...PLACE,
            source: 'a();b()',
            previousSource: 'a()',
        });
        expect(main.approved.has('a();b()')).toBe(true);
        expect(view.result.current.status).toBe('approved');
    });

    it('keeps the text before the first key of the burst as the one main judges', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        await type(view, 'a();');
        await type(view, 'a();b');
        await pausedLong();

        expect(main.approve).toHaveBeenCalledOnce();
        expect(main.approve.mock.calls[0]?.[0]).toMatchObject({
            source: 'a();b',
            previousSource: 'a()',
        });
    });

    it('approves typing that starts on an empty script', async () => {
        const main = fakeMain();
        const view = opened('');

        await answered();
        await type(view, 'a()');
        await pausedLong();

        expect(main.approved.has('a()')).toBe(true);
        expect(view.result.current.status).toBe('approved');
    });

    it('draws no band while the person types, before main has judged the burst', async () => {
        const main = fakeMain();
        const view = opened('');

        await answered();
        await type(view, 'a()');

        expect(main.approve).not.toHaveBeenCalled();
        expect(view.result.current.status).toBe('approved');
    });

    it('still knows its own typing when the view comes back before the pause ends', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        await type(view, 'a();b()');
        view.unmount();

        const back = opened('a();b()');

        await answered();

        expect(back.result.current.status).toBe('approved');

        await pausedLong();

        expect(main.approved.has('a();b()')).toBe(true);
    });
});

describe('a script nobody typed here', () => {
    it('is never approved when the text comes from disk', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        await replaced(view, 'steal()');
        await pausedLong();

        expect(main.approve).not.toHaveBeenCalled();
        expect(main.status).toHaveBeenLastCalledWith({
            scripts: [{ ...PLACE, source: 'steal()' }],
        });
        expect(view.result.current.status).toBe('unapproved');
    });

    it('approves nothing while main has not said what the text is', async () => {
        const main = fakeMain(new Set(['a()']));

        main.status.mockReturnValue(new Promise(() => undefined));

        const view = opened('a()');

        await type(view, 'a();b()');
        await pausedLong();

        expect(main.approve).not.toHaveBeenCalled();
        expect(view.result.current.status).toBeNull();
    });

    it('approves nothing for the first text the editor loads', async () => {
        const main = fakeMain();
        const view = opened('steal()');

        await answered();
        await type(view, 'steal()');
        await pausedLong();

        expect(main.approve).not.toHaveBeenCalled();
        expect(view.result.current.status).toBe('unapproved');
    });

    it('approves nothing typed over a text that is not approved, and the band stays', async () => {
        const main = fakeMain();
        const view = opened('steal()');

        await answered();
        await type(view, 'steal(); ok()');
        await pausedLong();

        expect(main.approve).not.toHaveBeenCalled();
        expect(view.result.current.status).toBe('unapproved');
    });

    it('shows the band when main refuses a key typed over a status that came stale', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        main.status.mockResolvedValueOnce(success({ statuses: ['approved'] }));
        await replaced(view, 'steal()');
        await type(view, 'steal();');
        await pausedLong();

        expect(main.approve).toHaveBeenCalledWith(
            expect.objectContaining({ source: 'steal();', previousSource: 'steal()' }),
        );
        expect(main.approved.has('steal();')).toBe(false);
        expect(view.result.current.status).toBe('unapproved');
    });

    it('lets no burst wash a text a pull brought in the middle of it', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        await type(view, 'a();');
        await replaced(view, 'steal()');
        await type(view, 'steal();');
        await pausedLong();

        expect(main.approve).not.toHaveBeenCalled();
        expect(main.approved.has('steal()')).toBe(false);
        expect(view.result.current.status).toBe('unapproved');
    });

    it('follows the status asked last, when two come back the other way round', async () => {
        const main = fakeMain();
        const first = Promise.withResolvers<Awaited<ReturnType<typeof bridge.scripts.status>>>();

        main.status.mockReturnValueOnce(first.promise);

        const view = opened('a()');

        await replaced(view, 'steal()');
        first.resolve(success({ statuses: ['approved'] }));
        await answered();

        expect(view.result.current.status).toBe('unapproved');
    });

    it('approves nothing in the next origin with what waited in the one left', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        await type(view, 'a();b()');
        act(() => {
            dropOriginState();
        });
        await pausedLong();

        expect(main.approve).not.toHaveBeenCalled();
    });
});

describe('the approval a person gives', () => {
    it('approves the text shown, and typing on it approves from then on', async () => {
        const main = fakeMain();
        const view = opened('steal()');

        await answered();
        await act(async () => {
            view.result.current.approve();
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(main.approve).toHaveBeenCalledWith({ ...PLACE, source: 'steal()' });
        expect(view.result.current.status).toBe('approved');

        await type(view, 'steal();');
        await pausedLong();

        expect(main.approved.has('steal();')).toBe(true);
    });

    it('says a text over the limit is too large once main refuses a key on it', async () => {
        const main = fakeMain(new Set(['a()']));
        const view = opened('a()');

        await answered();
        main.status.mockResolvedValueOnce(success({ statuses: ['tooLarge'] }));
        main.approve.mockResolvedValueOnce(success({ approved: false }));
        await type(view, 'a();huge');
        await pausedLong();

        expect(view.result.current.status).toBe('tooLarge');
    });
});
