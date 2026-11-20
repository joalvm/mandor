import { act, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

/** One name in each place of a request that speaks variables, none of them declared. */
export const UNDECLARED_BODY = {
    auth: { token: '{{inAuth}}', type: 'bearer' },
    headers: [{ enabled: true, key: 'X-Trace', value: '{{inHeader}}' }],
    kind: 'request',
    method: 'GET',
    name: 'crear pedido',
    pathParams: [{ enabled: true, key: 'id', value: '{{inPath}}' }],
    query: [{ enabled: true, key: 'page', value: '{{inQuery}}' }],
    url: '{{inUrl}}/pedidos/:id',
};

/** The token a name is painted as, once the tab that holds it is on screen. */
function tokenOf(name: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-variable="${name}"]`);

        if (found === null) {
            throw new Error(`no token for ${name}`);
        }

        return found;
    });
}

/**
 * Lets what a section reads on arrival land. Its redraw replaces the token, and a pointer that
 * came over the old one would be left over nothing: the hover would never open its panel.
 */
export async function settled(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
    });
}

/** The pointer comes over one token and the wait before its panel is paid at once. */
async function hoverOnce(token: HTMLElement): Promise<void> {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] });

    try {
        fireEvent.pointerOver(token);
        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });
    } finally {
        vi.useRealTimers();
    }
}

/**
 * The pointer comes to rest on the token of `name`, and the wait before its panel comes up is
 * paid at once instead of on the clock: four tenths of a second of nothing, in every test, was
 * most of what these files took.
 *
 * A section that reads something on arrival can redraw after `settled` on a busy machine, and
 * the redraw replaces the token under the pointer: the panel of the old one never comes up. So
 * the pointer rests again on the token that stands now, until its panel is there.
 */
export async function restOn(name: string): Promise<void> {
    await waitFor(async () => {
        await hoverOnce(await tokenOf(name));

        if (document.querySelector(`[role="dialog"][aria-label="{{${name}}}"]`) === null) {
            throw new Error(`no panel over ${name}`);
        }
    });
}
