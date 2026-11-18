import { EMPTY_UI_SESSION, success } from '@mandor/ipc';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { createPendingWrites, scopeToOrigin, shellStore } from '@mandor/shell';
import { createStore } from 'zustand/vanilla';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { switchOriginTo } from '../../src/lib/switch-origin-to.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({
    id: 'equipo',
    name: 'Equipo',
    url: 'https://github.com/equipo/api.git',
});

const fed = scopeToOrigin(createStore<{ items: string[] }>(() => ({ items: [] })));
const events: string[] = [];
const edits = createPendingWrites<string, string>((key, text) => {
    events.push(`write ${key}=${text}`);

    return Promise.resolve();
});

beforeEach(async () => {
    events.length = 0;
    fed.setState({ items: [] });
    shellStore.getState().reset();
    shellStore.getState().setOrigins([LOCAL, TEAM]);

    vi.spyOn(window.mandor.session, 'save').mockImplementation(() => {
        events.push('session.save');

        return Promise.resolve(success({}));
    });
    vi.spyOn(window.mandor.session, 'load').mockImplementation(() => {
        events.push('session.load');

        return Promise.resolve(success(EMPTY_UI_SESSION));
    });
    vi.spyOn(window.mandor.origin, 'switch').mockImplementation(() => {
        events.push(`origin.switch fed=${String(fed.getState().items.length)}`);

        return Promise.resolve(success({ repo: null, workspaces: [] }));
    });

    await shellStore.getState().loadSession(LOCAL.id);
    events.length = 0;
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('switching origin (switch-origin-to)', () => {
    it('closes what the app holds, writes the session, drops the state and then opens', async () => {
        const adopt = vi.fn(() => {
            events.push('adopt');

            return Promise.resolve();
        });

        fed.setState({ items: ['a'] });
        await switchOriginTo(TEAM.id, {
            adopt,
            close: () => {
                events.push('close');

                return Promise.resolve();
            },
        });

        expect(events).toEqual(['close', 'session.save', 'origin.switch fed=0', 'adopt']);
        expect(adopt).toHaveBeenCalledWith(TEAM.id, { repo: null, workspaces: [] });
    });

    /** The edits still waiting for their pause belong to the origin being left, not the next. */
    it('puts what was typed on disk before anything of the origin closes', async () => {
        edits.schedule('notes', 'typed');
        await switchOriginTo(TEAM.id, {
            adopt: () => Promise.resolve(),
            close: () => {
                events.push('close');

                return Promise.resolve();
            },
        });

        expect(events.slice(0, 2)).toEqual(['write notes=typed', 'close']);
    });

    it('does nothing for the origin it is already on', async () => {
        const adopt = vi.fn(() => Promise.resolve());

        await switchOriginTo(LOCAL.id, { adopt });

        expect(adopt).not.toHaveBeenCalled();
        expect(events).toEqual([]);
    });

    it('reads the session of the origin it left back when the other one does not open', async () => {
        vi.spyOn(window.mandor.origin, 'switch').mockResolvedValue({
            ok: false,
            error: { code: 'origin-unreachable', message: 'no contesta' },
        });

        fed.setState({ items: ['a'] });
        await switchOriginTo(TEAM.id, { adopt: () => Promise.resolve() });

        expect(events).toEqual(['session.save', 'session.load']);
        expect(fed.getState().items).toEqual([]);
        expect(shellStore.getState().activeOriginId).toBe(LOCAL.id);
    });
});
