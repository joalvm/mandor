import type { KeyboardEvent, MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
    activateRow,
    clickActivation,
    type RowModifiers,
} from '../../../src/components/row/row-activation.js';

function keyOf(key: string, modifiers: Partial<RowModifiers> = {}): KeyboardEvent<HTMLElement> {
    return {
        altKey: modifiers.altKey ?? false,
        ctrlKey: modifiers.ctrlKey ?? false,
        key,
        metaKey: modifiers.metaKey ?? false,
        preventDefault: vi.fn(),
        shiftKey: modifiers.shiftKey ?? false,
    } as unknown as KeyboardEvent<HTMLElement>;
}

describe('activateRow', () => {
    it('takes Enter and hands back the keys that were held', () => {
        const take = vi.fn();

        activateRow(keyOf('Enter', { shiftKey: true }), take);

        expect(take).toHaveBeenCalledOnce();
        expect(take).toHaveBeenCalledWith(
            expect.objectContaining({
                altKey: false,
                ctrlKey: false,
                metaKey: false,
                shiftKey: true,
            }),
        );
    });

    it('keeps with Enter and only looks with space', () => {
        const take = vi.fn();

        activateRow(keyOf('Enter'), take);
        activateRow(keyOf(' '), take);

        expect(take).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ keep: true, space: false }),
        );
        expect(take).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ keep: false, space: true }),
        );
    });

    it('takes space, the other key a keyboard reader reaches a row with', () => {
        const take = vi.fn();

        activateRow(keyOf(' '), take);

        expect(take).toHaveBeenCalledOnce();
    });

    it('sinks the default of the keys it takes, so the row never scrolls away', () => {
        const preventDefault = vi.fn();
        const event = keyOf('Enter');

        event.preventDefault = preventDefault;

        activateRow(event, vi.fn());

        expect(preventDefault).toHaveBeenCalledOnce();
    });

    it('leaves every other key alone, for whoever listens after the row', () => {
        const preventDefault = vi.fn();
        const take = vi.fn();
        const event = keyOf('a');

        event.preventDefault = preventDefault;

        activateRow(event, take);

        expect(take).not.toHaveBeenCalled();
        expect(preventDefault).not.toHaveBeenCalled();
    });
});

describe('clickActivation', () => {
    function clickOf(detail: number): MouseEvent<HTMLElement> {
        return {
            altKey: false,
            ctrlKey: true,
            detail,
            metaKey: false,
            shiftKey: false,
        } as unknown as MouseEvent<HTMLElement>;
    }

    it('only looks on a single click and keeps on the second click of a double one', () => {
        expect(clickActivation(clickOf(1))).toEqual({
            altKey: false,
            ctrlKey: true,
            keep: false,
            metaKey: false,
            shiftKey: false,
        });
        expect(clickActivation(clickOf(2))).toMatchObject({ keep: true });
    });
});
